package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sft/internal/models"
	"sort"
	"sync"
)

const (
	defaultSetDataPath = "data/set16_champions.json"
	defaultTraitDir    = "static/assets/Traits/SET16"
	defaultUnitDir     = "static/assets/Units/SET16"
	defaultSpellDir    = "static/assets/Spells/SET16/webp-64"
)

// LoadUnitsConfig makes the unit loader configurable and testable.
type LoadUnitsConfig struct {
	SetDataPath string
	TraitDir    string
	UnitDir     string
	SpellDir    string
}

// applyDefaults fills in missing config values with defaults.
func (c *LoadUnitsConfig) applyDefaults() {
	if c.SetDataPath == "" {
		c.SetDataPath = defaultSetDataPath
	}
	if c.TraitDir == "" {
		c.TraitDir = defaultTraitDir
	}
	if c.UnitDir == "" {
		c.UnitDir = defaultUnitDir
	}
	if c.SpellDir == "" {
		c.SpellDir = defaultSpellDir
	}
}

// UnitsSource defines the capability to load champion units.
type UnitsSource interface {
	LoadUnits(ctx context.Context) (*models.UnitsData, error)
}

// LocalUnitsLoader loads units from local JSON and asset files.
type LocalUnitsLoader struct {
	cfg     LoadUnitsConfig
	once    sync.Once
	data    *models.UnitsData
	loadErr error
}

// NewUnitsLoader returns a file-based loader with sane defaults.
func NewUnitsLoader(cfg LoadUnitsConfig) *LocalUnitsLoader {
	cfg.applyDefaults()
	return &LocalUnitsLoader{cfg: cfg}
}

// LoadUnits loads and adapts champions from the generated set JSON.
// Results are cached after the first call.
func (l *LocalUnitsLoader) LoadUnits(_ context.Context) (*models.UnitsData, error) {
	l.once.Do(func() {
		l.data, l.loadErr = l.load()
	})
	return l.data, l.loadErr
}

// load orchestrates the loading pipeline.
func (l *LocalUnitsLoader) load() (*models.UnitsData, error) {
	setData, err := readSetFile(l.cfg.SetDataPath)
	if err != nil {
		return nil, err
	}

	assets := l.buildAssetMaps()
	units := l.adaptChampions(setData.Champions, assets)
	sortUnitsByCostAndName(units)

	return &models.UnitsData{Units: units}, nil
}

// assetMaps holds all asset path lookups.
type assetMaps struct {
	traits map[string]string
	units  map[string]string
	spells map[string]string
}

// buildAssetMaps creates lookup maps for all asset types.
func (l *LocalUnitsLoader) buildAssetMaps() assetMaps {
	spells := SpellIndexer.Index(l.cfg.SpellDir)
	if len(spells) == 0 && l.cfg.SpellDir != defaultSpellDir {
		spells = SpellIndexer.Index(defaultSpellDir)
	}

	return assetMaps{
		traits: TraitIndexer.Index(l.cfg.TraitDir),
		units:  UnitIndexer.Index(l.cfg.UnitDir),
		spells: spells,
	}
}

// adaptChampions converts raw champion data to domain models.
func (l *LocalUnitsLoader) adaptChampions(champions []setChampion, assets assetMaps) []models.Unit {
	units := make([]models.Unit, 0, len(champions))

	for _, ch := range champions {
		unit, ok := adaptChampion(ch, assets.traits, assets.units, assets.spells)
		if ok {
			units = append(units, unit)
		}
	}

	return units
}

// readSetFile reads and parses the set JSON file.
func readSetFile(path string) (*setFile, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}

	var set setFile
	if err := json.Unmarshal(data, &set); err != nil {
		return nil, fmt.Errorf("decode %s: %w", path, err)
	}

	return &set, nil
}

// sortUnitsByCostAndName sorts units by cost (ascending), then by name (alphabetical).
func sortUnitsByCostAndName(units []models.Unit) {
	sort.SliceStable(units, func(i, j int) bool {
		if units[i].Cost != units[j].Cost {
			return units[i].Cost < units[j].Cost
		}
		return units[i].Name < units[j].Name
	})
}
