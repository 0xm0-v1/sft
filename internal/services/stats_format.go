package services

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// FormatPercent converts a ratio (0.25) to a rounded percentage string (25%).
func FormatPercent(value float64) string {
	pct := math.Round(value * 100)
	return strconv.Itoa(int(pct)) + "%"
}

// FormatAttackSpeed always shows two decimals (e.g. 0.80).
func FormatAttackSpeed(value float64) string {
	return fmt.Sprintf("%.2f", value)
}

// FormatIntList joins a list of ints with "/" (e.g. 50/75/113).
func FormatIntList(values []int) string {
	return FormatIntListWithSep(values, "/")
}

// FormatIntListWithSep joins ints with a custom separator.
func FormatIntListWithSep(values []int, sep string) string {
	if len(values) == 0 {
		return "N/A"
	}
	if sep == "" {
		sep = "/"
	}
	parts := make([]string, 0, len(values))
	for _, v := range values {
		parts = append(parts, strconv.Itoa(v))
	}
	return strings.Join(parts, sep)
}

// FormatMana shows current / total mana with the same pattern as the mock.
func FormatMana(initial, mana int) string {
	if initial == 0 && mana == 0 {
		return "0"
	}
	return fmt.Sprintf("%d/%d", initial, mana)
}
