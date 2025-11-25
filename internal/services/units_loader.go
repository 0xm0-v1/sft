package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sft/internal/models"
	"sort"
	"strings"
	"sync"
)

const (
	defaultSetDataPath = "data/set16_champions.json"
	defaultTraitDir    = "static/assets/Traits/SET16"
	defaultUnitDir     = "static/assets/Units/SET16"
)

// LoadUnitsConfig makes the unit loader configurable and testable.
type LoadUnitsConfig struct {
	SetDataPath string
	TraitDir    string
	UnitDir     string
}

// UnitsSource defines the capability to load champion units.
type UnitsSource interface {
	LoadUnits(ctx context.Context) (*models.UnitsData, error)
}

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
// In prod this runs once at startup; in dev relance Air pour recharger les données.
func (l *LocalUnitsLoader) loadFromDisk() (*models.UnitsData, error) {
	file, err := os.ReadFile(l.cfg.SetDataPath)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", l.cfg.SetDataPath, err)
	}

	var data setFile
	if err := json.Unmarshal(file, &data); err != nil {
		return nil, fmt.Errorf("decode %s: %w", l.cfg.SetDataPath, err)
	}

	traitIcons := buildTraitIconMap(l.cfg.TraitDir)
	unitImages := buildUnitImageMap(l.cfg.UnitDir)

	units := make([]models.Unit, 0, len(data.Champions))
	for _, ch := range data.Champions {
		unit, ok := adaptChampion(ch, traitIcons, unitImages)
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

// buildTraitIconMap indexes local trait SVGs for quick lookup.
func buildTraitIconMap(dir string) map[string]string {
	m := make(map[string]string)
	files, err := os.ReadDir(dir)
	if err != nil {
		return m
	}
	for _, f := range files {
		name := strings.TrimSuffix(f.Name(), filepath.Ext(f.Name()))
		m[name] = filepath.ToSlash(filepath.Join(dir, f.Name()))
	}
	return m
}

// buildUnitImageMap indexes local unit portraits by champion name (case-insensitive).
func buildUnitImageMap(dir string) map[string]string {
	m := make(map[string]string)
	files, err := os.ReadDir(dir)
	if err != nil {
		return m
	}
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		base := strings.TrimSuffix(f.Name(), filepath.Ext(f.Name()))
		// some files contain dots in the suffix; split on first dot
		parts := strings.SplitN(base, ".", 2)
		key := unitSlug(parts[0])
		m[key] = filepath.ToSlash(filepath.Join(dir, f.Name()))
	}
	return m
}
