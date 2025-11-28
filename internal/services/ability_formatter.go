package services

import (
	"fmt"
	"html"
	"html/template"
	"regexp"
	"strconv"
	"strings"
	"unicode"

	"sft/internal/models"
)

var (
	// Matches tokens like @MagicDamage.values@ or @AttackSpeed@
	abilityAtTokenRe = regexp.MustCompile(`@([A-Za-z0-9_*]+(?:\.[A-Za-z0-9_*]+)?)@`)
	// Matches tokens like {MagicDamage} or {AttackSpeed*100}
	abilityBraceTokenRe = regexp.MustCompile(`{([A-Za-z0-9_.\*]+)}`)
	// Matches parentheses containing at least one @token@
	abilityParenTokenRe = regexp.MustCompile(`\(\s*([^()]*@[^@()]+@[^()]*)\s*\)`)
)

// FormatAbilityDescription renders the ability description by interpolating variables into HTML.
func FormatAbilityDescription(ability models.Ability) template.HTML {
	desc := strings.TrimSpace(ability.Description)
	if desc == "" {
		desc = strings.TrimSpace(ability.DescriptionRaw)
	}
	if desc == "" {
		return ""
	}

	// Escape any unexpected HTML before injecting our spans.
	escaped := html.EscapeString(desc)
	withParen := replaceParenthesizedTokens(escaped, ability.Variables)
	withAtTokens := replaceAbilityTokens(withParen, ability.Variables, abilityAtTokenRe)
	withBraceTokens := replaceAbilityTokens(withAtTokens, ability.Variables, abilityBraceTokenRe)
	withLineBreaks := strings.ReplaceAll(withBraceTokens, "\n", "<br />")

	return template.HTML(strings.TrimSpace(withLineBreaks))
}

func replaceParenthesizedTokens(desc string, vars map[string]models.AbilityVariable) string {
	if len(vars) == 0 {
		return desc
	}
	return abilityParenTokenRe.ReplaceAllStringFunc(desc, func(match string) string {
		parts := abilityParenTokenRe.FindStringSubmatch(match)
		if len(parts) != 2 {
			return match
		}

		inner := strings.TrimSpace(parts[1])
		rendered := replaceAbilityTokens(inner, vars, abilityAtTokenRe)
		rendered = replaceAbilityTokens(rendered, vars, abilityBraceTokenRe)
		if rendered == "" || rendered == inner {
			return match
		}

		return fmt.Sprintf(`<span class="ability-scaling-group"><span class="ability-scaling-paren">(</span>%s<span class="ability-scaling-paren">)</span></span>`, rendered)
	})
}

func replaceAbilityTokens(desc string, vars map[string]models.AbilityVariable, re *regexp.Regexp) string {
	if len(vars) == 0 {
		return desc
	}

	return re.ReplaceAllStringFunc(desc, func(match string) string {
		parts := re.FindStringSubmatch(match)
		if len(parts) != 2 {
			return match
		}

		token := parts[1]
		name, field := splitToken(token)

		v, ok := vars[name]
		if !ok {
			return match
		}

		rendered := renderAbilityValue(v, field)
		if rendered == "" {
			return match
		}
		return rendered
	})
}

func renderAbilityValue(v models.AbilityVariable, field string) string {
	content := selectAbilityContent(v, field)
	if content == "" {
		return ""
	}

	if field == "scaling" {
		if icons := renderScalingIcons(v); icons != "" {
			return icons
		}
	}

	classes := []string{"ability-token"}
	if css := strings.TrimSpace(v.CSSClass); css != "" {
		classes = append(classes, css)
	}

	return fmt.Sprintf(
		`<span class="%s">%s</span>`,
		strings.Join(classes, " "),
		html.EscapeString(content),
	)
}

func selectAbilityContent(v models.AbilityVariable, field string) string {
	switch field {
	case "values", "":
		if joined := joinDisplayValues(v.DisplayValues); joined != "" {
			return joined
		}
		if joined := joinAbilityValues(v.Values); joined != "" {
			return joined
		}
	case "scaling":
		if len(v.Scalings) > 0 {
			return strings.Join(v.Scalings, " + ")
		}
		if v.Scaling != "" {
			return v.Scaling
		}
	case "type":
		if v.Type != "" {
			return string(v.Type)
		}
	}

	// Fallbacks in case the requested field was missing.
	if joined := joinDisplayValues(v.DisplayValues); joined != "" {
		return joined
	}
	if joined := joinAbilityValues(v.Values); joined != "" {
		return joined
	}
	if v.Type != "" {
		return string(v.Type)
	}
	if v.Name != "" {
		return v.Name
	}

	return field
}

func joinAbilityValues(values []float64) string {
	if len(values) == 0 {
		return ""
	}

	parts := make([]string, len(values))
	for i, v := range values {
		parts[i] = strconv.FormatFloat(v, 'f', -1, 64)
	}
	return strings.Join(parts, "/")
}

func joinDisplayValues(values []string) string {
	if len(values) == 0 {
		return ""
	}
	parts := make([]string, 0, len(values))
	for _, v := range values {
		v = strings.TrimSpace(v)
		if v != "" {
			parts = append(parts, v)
		}
	}
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, "/")
}

func splitToken(token string) (name string, field string) {
	name = token
	if dot := strings.Index(token, "."); dot != -1 {
		name = token[:dot]
		field = token[dot+1:]
	}
	return
}

func scalingIconClass(raw string) string {
	key := normalizeScalingKey(raw)
	if key == "" {
		return ""
	}

	if cls, ok := scalingIconMap[key]; ok {
		return cls
	}
	return ""
}

func scalingParts(v models.AbilityVariable) []string {
	if len(v.Scalings) > 0 {
		return v.Scalings
	}
	if strings.TrimSpace(v.Scaling) != "" {
		return []string{v.Scaling}
	}
	return nil
}

func renderScalingIcons(v models.AbilityVariable) string {
	parts := scalingParts(v)
	if len(parts) == 0 {
		return ""
	}

	var rendered []string
	for i, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if i > 0 {
			rendered = append(rendered, `<span class="ability-scaling-plus">+</span>`)
		}
		if iconClass := scalingIconClass(part); iconClass != "" {
			// Include text content as fallback, CSS will hide it when icon loads
			// Format: <span class="..."><span class="sr-only">AP</span></span>
			// The icon is shown via CSS mask, text is screen-reader accessible
			rendered = append(rendered, fmt.Sprintf(
				`<span class="ability-scaling-block"><span class="%s" aria-label="%s"><span class="ability-icon-text">%s</span></span></span>`,
				iconClass,
				html.EscapeString(part),
				html.EscapeString(part),
			))
		} else {
			rendered = append(rendered, fmt.Sprintf(
				`<span class="ability-token">%s</span>`,
				html.EscapeString(part),
			))
		}
	}

	if len(rendered) == 0 {
		return ""
	}
	return strings.Join(rendered, "")
}

func normalizeScalingKey(s string) string {
	var b strings.Builder
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(unicode.ToUpper(r))
		}
	}
	return b.String()
}

var scalingIconMap = map[string]string{
	"AP":    "ability-token ability-icon ability-icon-ap",
	"AD":    "ability-token ability-icon ability-icon-ad",
	"AS":    "ability-token ability-icon ability-icon-as",
	"ARMOR": "ability-token ability-icon ability-icon-armor",
	"MR":    "ability-token ability-icon ability-icon-mr",
	"CC":    "ability-token ability-icon ability-icon-crit-chance",
	"CD":    "ability-token ability-icon ability-icon-crit-damage",
	"HP":    "ability-token ability-icon ability-icon-health",
	"MANA":  "ability-token ability-icon ability-icon-mana",
	"RANGE": "ability-token ability-icon ability-icon-range",
	"SOULS": "ability-token ability-icon ability-icon-souls",
}
