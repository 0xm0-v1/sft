package services

import (
	"os"
	"path/filepath"
	"testing"
)

func TestAssetIndexer_Index(t *testing.T) {
	// Create temp directory with test files
	dir := t.TempDir()

	files := []string{
		"Ahri.jpg",
		"Anivia.CjTbL0xA.jpg",
		"Jinx.png",
		"README.txt",
	}
	for _, f := range files {
		os.WriteFile(filepath.Join(dir, f), []byte("test"), 0644)
	}

	t.Run("default indexer indexes all files", func(t *testing.T) {
		idx := AssetIndexer{}
		result := idx.Index(dir)

		if len(result) != 4 {
			t.Errorf("expected 4 files, got %d", len(result))
		}
		if _, ok := result["ahri"]; !ok {
			t.Error("expected 'ahri' key")
		}
		if _, ok := result["anivia"]; !ok {
			t.Error("expected 'anivia' key (dot-stripped)")
		}
	})

	t.Run("filtered indexer respects extensions", func(t *testing.T) {
		idx := AssetIndexer{
			FilterExt: []string{".jpg"},
		}
		result := idx.Index(dir)

		if len(result) != 2 {
			t.Errorf("expected 2 jpg files, got %d", len(result))
		}
		if _, ok := result["jinx"]; ok {
			t.Error("should not include .png files")
		}
	})

	t.Run("custom slug function", func(t *testing.T) {
		idx := AssetIndexer{
			SlugFunc: func(name string) string {
				return "custom-" + name
			},
		}
		result := idx.Index(dir)

		if _, ok := result["custom-Ahri"]; !ok {
			t.Error("expected custom slug function to be applied")
		}
	})
}

func TestTraitSlug(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Freljord", "freljord"},
		{"Black Rose", "black-rose"},
		{"Kai'Sa", "kaisa"},
		{"Dr. Mundo", "dr-mundo"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := traitSlug(tt.input)
			if got != tt.expected {
				t.Errorf("traitSlug(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestUnitSlug(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Ahri", "ahri"},
		{"Kai'Sa", "kaisa"},
		{"Dr. Mundo", "drmundo"},
		{"TFT13_Ahri", "tft13ahri"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := unitSlug(tt.input)
			if got != tt.expected {
				t.Errorf("unitSlug(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestPredefinedIndexers(t *testing.T) {
	t.Run("TraitIndexer uses traitSlug", func(t *testing.T) {
		if TraitIndexer.SlugFunc == nil {
			t.Error("TraitIndexer.SlugFunc should not be nil")
		}
		got := TraitIndexer.SlugFunc("Black Rose")
		if got != "black-rose" {
			t.Errorf("expected 'black-rose', got %q", got)
		}
	})

	t.Run("SpellIndexer filters image extensions", func(t *testing.T) {
		expected := map[string]bool{".png": true, ".jpg": true, ".jpeg": true, ".webp": true}
		for _, ext := range SpellIndexer.FilterExt {
			if !expected[ext] {
				t.Errorf("unexpected extension in SpellIndexer: %s", ext)
			}
		}
	})
}
