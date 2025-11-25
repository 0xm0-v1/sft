package services

import (
	"os"
	"sft/internal/models"
	"testing"
)

func TestLoadUnitsConfig_ApplyDefaults(t *testing.T) {
	t.Run("empty config gets all defaults", func(t *testing.T) {
		cfg := LoadUnitsConfig{}
		cfg.applyDefaults()

		if cfg.SetDataPath != defaultSetDataPath {
			t.Errorf("SetDataPath = %q, want %q", cfg.SetDataPath, defaultSetDataPath)
		}
		if cfg.TraitDir != defaultTraitDir {
			t.Errorf("TraitDir = %q, want %q", cfg.TraitDir, defaultTraitDir)
		}
		if cfg.UnitDir != defaultUnitDir {
			t.Errorf("UnitDir = %q, want %q", cfg.UnitDir, defaultUnitDir)
		}
		if cfg.SpellDir != defaultSpellDir {
			t.Errorf("SpellDir = %q, want %q", cfg.SpellDir, defaultSpellDir)
		}
	})

	t.Run("custom values are preserved", func(t *testing.T) {
		cfg := LoadUnitsConfig{
			SetDataPath: "custom/path.json",
			TraitDir:    "custom/traits",
		}
		cfg.applyDefaults()

		if cfg.SetDataPath != "custom/path.json" {
			t.Error("custom SetDataPath was overwritten")
		}
		if cfg.TraitDir != "custom/traits" {
			t.Error("custom TraitDir was overwritten")
		}
		if cfg.UnitDir != defaultUnitDir {
			t.Error("UnitDir should have default value")
		}
	})
}

func TestSortUnitsByCostAndName(t *testing.T) {
	units := []models.Unit{
		{Name: "Zoe", Cost: 3},
		{Name: "Ahri", Cost: 1},
		{Name: "Jinx", Cost: 3},
		{Name: "Brand", Cost: 1},
		{Name: "Lux", Cost: 5},
	}

	sortUnitsByCostAndName(units)

	expected := []struct {
		name string
		cost int
	}{
		{"Ahri", 1},
		{"Brand", 1},
		{"Jinx", 3},
		{"Zoe", 3},
		{"Lux", 5},
	}

	for i, exp := range expected {
		if units[i].Name != exp.name || units[i].Cost != exp.cost {
			t.Errorf("position %d: got {%s, %d}, want {%s, %d}",
				i, units[i].Name, units[i].Cost, exp.name, exp.cost)
		}
	}
}

func TestSortUnitsByCostAndName_EmptySlice(t *testing.T) {
	var units []models.Unit
	sortUnitsByCostAndName(units)

	if len(units) != 0 {
		t.Error("empty slice should remain empty")
	}
}

func TestSortUnitsByCostAndName_SingleElement(t *testing.T) {
	units := []models.Unit{{Name: "Solo", Cost: 2}}
	sortUnitsByCostAndName(units)

	if units[0].Name != "Solo" {
		t.Error("single element should remain unchanged")
	}
}

func TestNewUnitsLoader_AppliesDefaults(t *testing.T) {
	loader := NewUnitsLoader(LoadUnitsConfig{})

	if loader.cfg.SetDataPath != defaultSetDataPath {
		t.Error("loader should have default SetDataPath")
	}
}

func TestReadSetFile_FileNotFound(t *testing.T) {
	_, err := readSetFile("nonexistent/file.json")

	if err == nil {
		t.Error("expected error for missing file")
	}
}

func TestReadSetFile_InvalidJSON(t *testing.T) {
	tmpDir := t.TempDir()
	tmpFile := tmpDir + "/invalid.json"

	if err := os.WriteFile(tmpFile, []byte("not valid json {{{"), 0644); err != nil {
		t.Fatal(err)
	}

	_, err := readSetFile(tmpFile)
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestReadSetFile_ValidJSON(t *testing.T) {
	tmpDir := t.TempDir()
	tmpFile := tmpDir + "/valid.json"

	content := `{"champions": [{"name": "Test", "cost": 1}]}`
	if err := os.WriteFile(tmpFile, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	data, err := readSetFile(tmpFile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(data.Champions) != 1 {
		t.Errorf("expected 1 champion, got %d", len(data.Champions))
	}
	if data.Champions[0].Name != "Test" {
		t.Errorf("expected name 'Test', got %q", data.Champions[0].Name)
	}
}
