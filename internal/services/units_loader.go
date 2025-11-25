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
	if cfg.SetDataPath == "" {
		cfg.SetDataPath = defaultSetDataPath
	}
	if cfg.TraitDir == "" {
		cfg.TraitDir = defaultTraitDir
	}
	if cfg.UnitDir == "" {
		cfg.UnitDir = defaultUnitDir
	}
	if cfg.SpellDir == "" {
		cfg.SpellDir = defaultSpellDir
	}
	return &LocalUnitsLoader{cfg: cfg}
}

// LoadUnits loads and adapts champions from the generated set JSON.
func (l *LocalUnitsLoader) LoadUnits(_ context.Context) (*models.UnitsData, error) {
	l.once.Do(func() {
		l.data, l.loadErr = l.loadFromDisk()
	})
	return l.data, l.loadErr
}

// loadFromDisk reads the dataset and builds in-memory indices.
func (l *LocalUnitsLoader) loadFromDisk() (*models.UnitsData, error) {
	file, err := os.ReadFile(l.cfg.SetDataPath)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", l.cfg.SetDataPath, err)
	}

	var data setFile
	if err := json.Unmarshal(file, &data); err != nil {
		return nil, fmt.Errorf("decode %s: %w", l.cfg.SetDataPath, err)
	}

	// Build asset indexes using the generic indexer (DRY)
	traitIcons := TraitIndexer.Index(l.cfg.TraitDir)
	unitImages := UnitIndexer.Index(l.cfg.UnitDir)
	spellImages := SpellIndexer.Index(l.cfg.SpellDir)

	// Fallback to default spell dir if custom one is empty
	if len(spellImages) == 0 && l.cfg.SpellDir != defaultSpellDir {
		spellImages = SpellIndexer.Index(defaultSpellDir)
	}

	units := make([]models.Unit, 0, len(data.Champions))
	for _, ch := range data.Champions {
		unit, ok := adaptChampion(ch, traitIcons, unitImages, spellImages)
		if !ok {
			continue
		}
		units = append(units, unit)
	}

	sort.SliceStable(units, func(i, j int) bool {
		if units[i].Cost == units[j].Cost {
			return units[i].Name < units[j].Name
		}
		return units[i].Cost < units[j].Cost
	})

	return &models.UnitsData{Units: units}, nil
}
