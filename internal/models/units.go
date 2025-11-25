package models

type VariableType string

// AbilityVariable represents a variable in ability description
type AbilityVariable struct {
	Name          string       `json:"name"`
	Type          VariableType `json:"type"`
	Values        []float64    `json:"values,omitempty"`
	DisplayValues []string     `json:"displayValues,omitempty"`
	Scaling       string       `json:"scaling,omitempty"`
	Scalings      []string     `json:"scalings,omitempty"`
	CSSClass      string       `json:"cssClass,omitempty"`
}

// Ability represents a unit's ability/spell
type Ability struct {
	Name           string                     `json:"name"`
	Description    string                     `json:"description"`
	DescriptionRaw string                     `json:"descriptionRaw,omitempty"`
	Variables      map[string]AbilityVariable `json:"variables"`
	Icon           string                     `json:"icon,omitempty"`
}

// Trait represents a TFT trait/synergy
type Trait struct {
	Name string `json:"name"`
	Icon string `json:"icon"`
}

// UnitStats holds the base stats shown in the tooltip.
type UnitStats struct {
	HP             []int   `json:"hp"`
	Damage         []int   `json:"damage"`
	Armor          int     `json:"armor"`
	MagicResist    int     `json:"magicResist"`
	AttackSpeed    float64 `json:"attackSpeed"`
	CritChance     float64 `json:"critChance"`
	CritMultiplier float64 `json:"critMultiplier"`
	Mana           int     `json:"mana"`
	InitialMana    int     `json:"initialMana"`
	Range          int     `json:"range"`
	AbilityPower   int     `json:"abilityPower"`
}

// Unit represents a TFT unit/champion
type Unit struct {
	Name              string    `json:"name"`
	Cost              int       `json:"cost"`
	URL               string    `json:"url"`
	Traits            []Trait   `json:"traits"`
	Ability           Ability   `json:"ability"`
	Unlock            bool      `json:"unlock"`
	UnlockDescription string    `json:"unlockDescription"`
	Role              string    `json:"role"`
	Stats             UnitStats `json:"stats"`
}

// UnitsData contains the complete list of units
type UnitsData struct {
	Units []Unit `json:"units"`
}

// MakeRange generates a slice of integers from min to max (exclusive)
func MakeRange(min, max int) []int {
	result := make([]int, max-min)
	for i := range result {
		result[i] = min + i
	}
	return result
}
