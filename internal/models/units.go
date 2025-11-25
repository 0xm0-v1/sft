package models

type VariableType string

// AbilityVariable represents a variable in ability description
type AbilityVariable struct {
	Name          string       `json:"name"`                    // "damage", "heal", "duration", etc.
	Type          VariableType `json:"type"`                    // Type of variable (damage type, heal, etc.)
	Values        []float64    `json:"values,omitempty"`        // Numeric values per star level, e.g. [1st, 2nd, 3rd]
	DisplayValues []string     `json:"displayValues,omitempty"` // Raw/text values as provided (keeps "%" or special symbols)
	Scaling       string       `json:"scaling,omitempty"`       // Primary scaling, e.g. "AP" or "AD"
	Scalings      []string     `json:"scalings,omitempty"`      // All scalings, supports multi-scaling (e.g. ["AD","AP"])
	CSSClass      string       `json:"cssClass,omitempty"`      // Optional CSS class hint for styling
}

// Ability represents a unit's ability/spell
type Ability struct {
	Name           string                     `json:"name"`                     // "Frostbite"
	Description    string                     `json:"description"`              // Template: "deals {damage} magic damage"
	DescriptionRaw string                     `json:"descriptionRaw,omitempty"` // Optional raw text straight from the source
	Variables      map[string]AbilityVariable `json:"variables"`                // Variables keyed by name for easy lookup
	Icon           string                     `json:"icon,omitempty"`           // Ability/spell icon (local path)
}

// Trait represents a TFT trait/synergy
type Trait struct {
	Name string `json:"name"` // "Freljord"
	Icon string `json:"icon"` // "static/assets/Traits/Freljord.png"
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
	Name              string    `json:"name"`              // "Ahri"
	Cost              int       `json:"cost"`              // 1-7
	URL               string    `json:"url"`               // "/static/assets/Units/SET16/Ahri.CjTbL0xA.jpg"
	Traits            []Trait   `json:"traits"`            // Changed from []string to []Trait
	Ability           Ability   `json:"ability"`           // Unit's ability details
	Unlock            bool      `json:"unlock"`            // Unlockable Units
	UnlockDescription string    `json:"unlockDescription"` // Unlockable Units Description
	Role              string    `json:"role"`              // "Magic Tank"
	Stats             UnitStats `json:"stats"`             // Base stats for tooltip
}

// UnitsData contains the complete list of units
type UnitsData struct {
	Units []Unit `json:"units"`
}
