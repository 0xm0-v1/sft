package services

import (
	"regexp"
	"strings"
)

// normalizeDescription cleans the sourced tooltip into our placeholder format.
func normalizeDescription(desc string) string {
	s := strings.ReplaceAll(desc, "&nbsp;", " ")

	reTracker := regexp.MustCompile(`(?s)<TFTTrackerLabel>.*?</TFTTrackerLabel>`)
	s = reTracker.ReplaceAllString(s, "")
	reUnitProp := regexp.MustCompile(`@TFTUnitProperty\.[^@]+@`)
	s = reUnitProp.ReplaceAllString(s, "")

	reTags := regexp.MustCompile(`</?[^>]+?>`)
	s = reTags.ReplaceAllString(s, "")

	s = strings.ReplaceAll(s, "\\\"", "")
	s = strings.ReplaceAll(s, "\">", "")

	reScale := regexp.MustCompile(`%i:[^%]+%`)
	s = reScale.ReplaceAllString(s, "")

	reKeyword := regexp.MustCompile(`(?i)\bkeyword\s*\d*\b`)
	s = reKeyword.ReplaceAllString(s, "")
	s = regexp.MustCompile(`(?i)\bkeyword\b`).ReplaceAllString(s, "")

	reDoubleBraces := regexp.MustCompile(`{{[^{}]+}}`)
	s = reDoubleBraces.ReplaceAllString(s, "")

	reVar := regexp.MustCompile(`@([A-Za-z0-9_]+(?:\*100)?)@`)
	s = reVar.ReplaceAllString(s, "{$1}")

	s = strings.ReplaceAll(s, " ()", "")
	s = strings.Join(strings.Fields(s), " ")
	return s
}
