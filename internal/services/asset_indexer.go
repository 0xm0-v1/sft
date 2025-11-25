// Package services provides business logic and data access.
package services

import (
	"os"
	"path/filepath"
	"strings"
)

// AssetIndexer builds slug-to-path maps from asset directories.
type AssetIndexer struct {
	// SlugFunc transforms a filename (without extension) into a lookup key.
	// Defaults to unitSlug if nil.
	SlugFunc func(name string) string

	// FilterExt limits indexing to specific extensions (lowercase, with dot).
	// If empty, all files are indexed.
	FilterExt []string
}

// Index scans the directory and returns a map of slug → relative file path.
func (idx AssetIndexer) Index(dir string) map[string]string {
	m := make(map[string]string)

	files, err := os.ReadDir(dir)
	if err != nil {
		return m
	}

	slugFn := idx.SlugFunc
	if slugFn == nil {
		slugFn = unitSlug
	}

	filterSet := idx.buildFilterSet()

	for _, f := range files {
		if f.IsDir() {
			continue
		}

		ext := strings.ToLower(filepath.Ext(f.Name()))
		if len(filterSet) > 0 && !filterSet[ext] {
			continue
		}

		base := strings.TrimSuffix(f.Name(), filepath.Ext(f.Name()))
		// Handle filenames with dots (e.g., "Ahri.CjTbL0xA.jpg")
		if dotIdx := strings.Index(base, "."); dotIdx > 0 {
			base = base[:dotIdx]
		}

		key := slugFn(base)
		m[key] = filepath.ToSlash(filepath.Join(dir, f.Name()))
	}

	return m
}

func (idx AssetIndexer) buildFilterSet() map[string]bool {
	if len(idx.FilterExt) == 0 {
		return nil
	}
	set := make(map[string]bool, len(idx.FilterExt))
	for _, ext := range idx.FilterExt {
		set[strings.ToLower(ext)] = true
	}
	return set
}

// Predefined indexers for common asset types.
var (
	// TraitIndexer indexes trait icons (SVGs, PNGs) using trait slug format.
	TraitIndexer = AssetIndexer{
		SlugFunc: traitSlug,
	}

	// UnitIndexer indexes unit portraits using unit slug format.
	UnitIndexer = AssetIndexer{
		SlugFunc: unitSlug,
	}

	// SpellIndexer indexes spell icons, filtering to image formats only.
	SpellIndexer = AssetIndexer{
		SlugFunc:  unitSlug,
		FilterExt: []string{".png", ".jpg", ".jpeg", ".webp"},
	}
)
