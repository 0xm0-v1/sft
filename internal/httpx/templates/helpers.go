package templates

import (
	"fmt"
	"html/template"
	"path/filepath"
	"strings"

	"sft/internal/services"
)

// Funcs returns the template function map used across views.
func Funcs() template.FuncMap {
	return template.FuncMap{
		"mod":               func(a, b int) int { return a % b },
		"formatAbility":     services.FormatAbilityDescription,
		"formatPercent":     services.FormatPercent,
		"formatAttackSpeed": services.FormatAttackSpeed,
		"formatIntList":     services.FormatIntList,
		"formatMana":        services.FormatMana,
		"dict": func(values ...any) (map[string]any, error) {
			if len(values)%2 != 0 {
				return nil, fmt.Errorf("dict expects even number of args")
			}
			dict := make(map[string]any, len(values)/2)
			for i := 0; i < len(values); i += 2 {
				key, ok := values[i].(string)
				if !ok {
					return nil, fmt.Errorf("dict keys must be strings")
				}
				dict[key] = values[i+1]
			}
			return dict, nil
		},
		"static":         staticPath,
		"unitWebpSrcset": buildUnitWebpSrcset,
		// slice creates a slice from variadic arguments - useful for range in templates
		"slice": func(items ...any) []any {
			return items
		},
	}
}

// staticPath builds the full static asset URL.
func staticPath(base, path string) string {
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}

	b := strings.TrimSpace(base)
	if b == "" {
		b = "/static"
	}
	b = "/" + strings.Trim(b, "/")

	p := "/" + strings.TrimLeft(path, "/")
	p = strings.TrimPrefix(p, "/static")

	return b + p
}

// buildUnitWebpSrcset returns a srcset string pointing to generated WebP variants.
func buildUnitWebpSrcset(base, path string, widths ...int) string {
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return ""
	}

	dir, file := filepath.Split(path)
	if file == "" {
		return ""
	}

	name := strings.TrimSuffix(file, filepath.Ext(file))
	dir = strings.TrimSuffix(filepath.ToSlash(dir), "/")

	if len(widths) == 0 {
		widths = []int{64, 256, 600}
	}

	parts := make([]string, 0, len(widths))
	for _, w := range widths {
		if w <= 0 {
			continue
		}
		webpPath := fmt.Sprintf("%s/webp-%d/%s.webp", dir, w, name)
		parts = append(parts, fmt.Sprintf("%s %dw", staticPath(base, webpPath), w))
	}

	return strings.Join(parts, ", ")
}
