package services

import (
	"sft/internal/models"
	"strings"
)

// adaptAbility normalizes, augments and resolves variables for a unit ability.
func adaptAbility(a setAbility) models.Ability {
	rawDesc := strings.TrimSpace(a.Description)
	if rawDesc == "" && a.DescriptionRaw != "" {
		rawDesc = strings.TrimSpace(a.DescriptionRaw)
	}

	desc := rawDesc
	if len(a.Variables.Map) == 0 {
		clean := normalizeDescription(a.Description)
		if clean != "" {
			desc = clean
		}
		if desc == "" && a.Description != "" {
			desc = strings.TrimSpace(a.Description)
		}
	}

	vars := make(map[string]models.AbilityVariable)
	if len(a.Variables.Map) > 0 {
		for name, v := range a.Variables.Map {
			vars[name] = models.AbilityVariable{
				Name:          strings.TrimSpace(name),
				Type:          models.VariableType(strings.TrimSpace(v.Type)),
				Values:        v.Values.Numbers(),
				DisplayValues: v.Values.Display(),
				Scaling:       strings.TrimSpace(v.Scaling.Primary()),
				Scalings:      v.Scaling.All(),
				CSSClass:      strings.TrimSpace(v.CSSClass),
			}
		}
	} else if len(a.Variables.List) > 0 {
		for _, v := range a.Variables.List {
			vars[v.Name] = models.AbilityVariable{
				Name:          strings.TrimSpace(v.Name),
				Values:        v.Value.Numbers(),
				DisplayValues: v.Value.Display(),
			}
		}
	}

	return models.Ability{
		Name:           strings.TrimSpace(a.Name),
		Description:    desc,
		DescriptionRaw: strings.TrimSpace(a.DescriptionRaw),
		Variables:      vars,
	}
}
