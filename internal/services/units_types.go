package services

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// minimal structs to decode the generated set JSON
type setFile struct {
	Champions []setChampion `json:"champions"`
}

type setChampion struct {
	APIName           string     `json:"apiName"`
	Name              string     `json:"name"`
	Cost              int        `json:"cost"`
	Traits            []string   `json:"traits"`
	Ability           setAbility `json:"ability"`
	Icons             setIcons   `json:"icons"`
	Unlock            bool       `json:"unlock"`
	UnlockDescription string     `json:"unlockDescription"`
	Role              string     `json:"role"`
	Stats             setStats   `json:"stats"`
}

type setAbility struct {
	Name           string              `json:"name"`
	Description    string              `json:"description"`
	DescriptionRaw string              `json:"descriptionRaw"`
	Variables      rawAbilityVariables `json:"variables"`
	SpellKey       string              `json:"spellKey"`
}

// scalingList accepts either a single string or an array of strings.
type scalingList []string

func (s *scalingList) UnmarshalJSON(data []byte) error {
	if len(data) == 0 || string(data) == "null" {
		return nil
	}

	var single string
	if err := json.Unmarshal(data, &single); err == nil {
		if trimmed := strings.TrimSpace(single); trimmed != "" {
			*s = scalingList{trimmed}
		}
		return nil
	}

	var list []string
	if err := json.Unmarshal(data, &list); err == nil {
		tmp := make([]string, 0, len(list))
		for _, item := range list {
			if trimmed := strings.TrimSpace(item); trimmed != "" {
				tmp = append(tmp, trimmed)
			}
		}
		*s = scalingList(tmp)
		return nil
	}

	return fmt.Errorf("unsupported scaling format: %s", string(data))
}

func (s scalingList) Primary() string {
	if len(s) == 0 {
		return ""
	}
	return s[0]
}

func (s scalingList) All() []string {
	if len(s) == 0 {
		return nil
	}
	return append([]string(nil), s...)
}

type setVariable struct {
	Name  string    `json:"name"`
	Value valueList `json:"value"`
}

type detailedAbilityVariable struct {
	Values   valueList   `json:"values"`
	Type     string      `json:"type"`
	Scaling  scalingList `json:"scaling"`
	CSSClass string      `json:"cssClass"`
}

type rawAbilityVariables struct {
	Map  map[string]detailedAbilityVariable
	List []setVariable
}

func (r *rawAbilityVariables) UnmarshalJSON(data []byte) error {
	if len(data) == 0 || string(data) == "null" {
		return nil
	}

	switch data[0] {
	case '{':
		return json.Unmarshal(data, &r.Map)
	case '[':
		return json.Unmarshal(data, &r.List)
	default:
		return nil
	}
}

type setIcons struct {
	Square   string `json:"square"`
	Tile     string `json:"tile"`
	Portrait string `json:"portrait"`
}

type setStats struct {
	Armor          float64   `json:"armor"`
	AttackSpeed    float64   `json:"attackSpeed"`
	CritChance     float64   `json:"critChance"`
	CritMultiplier float64   `json:"critMultiplier"`
	Damage         valueList `json:"damage"`
	HP             valueList `json:"hp"`
	InitialMana    float64   `json:"initialMana"`
	MagicResist    float64   `json:"magicResist"`
	Mana           float64   `json:"mana"`
	Range          float64   `json:"range"`
}

// valueList accepts numbers provided as JSON numbers or strings (keeps raw text).
type valueList struct {
	nums    []float64
	display []string
}

func (v *valueList) UnmarshalJSON(data []byte) error {
	if len(data) == 0 || string(data) == "null" {
		return nil
	}

	if v.parseSingle(data) {
		return nil
	}
	if v.parseArray(data) {
		return nil
	}

	return fmt.Errorf("unsupported number list format: %s", string(data))
}

func (v *valueList) parseSingle(data []byte) bool {
	var num float64
	if err := json.Unmarshal(data, &num); err == nil {
		v.nums = []float64{num}
		v.display = []string{formatFloat(num)}
		return true
	}

	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		str = strings.TrimSpace(str)
		v.display = []string{str}
		if parsed, err := parseFloatString(str); err == nil {
			v.nums = []float64{parsed}
		}
		return true
	}
	return false
}

func (v *valueList) parseArray(data []byte) bool {
	var rawItems []json.RawMessage
	if err := json.Unmarshal(data, &rawItems); err != nil {
		return false
	}

	nums := make([]float64, 0, len(rawItems))
	display := make([]string, 0, len(rawItems))

	for _, item := range rawItems {
		var num float64
		if err := json.Unmarshal(item, &num); err == nil {
			nums = append(nums, num)
			display = append(display, formatFloat(num))
			continue
		}
		var str string
		if err := json.Unmarshal(item, &str); err == nil {
			str = strings.TrimSpace(str)
			display = append(display, str)
			if parsed, err := parseFloatString(str); err == nil {
				nums = append(nums, parsed)
			}
		}
	}

	if len(display) == 0 {
		return false
	}

	v.nums = nums
	v.display = display
	return true
}

func (v valueList) Numbers() []float64 {
	if len(v.nums) == 0 {
		return nil
	}
	return append([]float64(nil), v.nums...)
}

func (v valueList) Display() []string {
	if len(v.display) == 0 {
		return nil
	}
	return append([]string(nil), v.display...)
}

func parseFloatString(s string) (float64, error) {
	t := strings.TrimSpace(s)
	t = strings.TrimSuffix(t, "%")
	return strconv.ParseFloat(t, 64)
}

func formatFloat(f float64) string {
	return strconv.FormatFloat(f, 'f', -1, 64)
}

// traitSlug normalizes trait names for map lookups.
func traitSlug(name string) string {
	s := strings.ToLower(name)
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, "'", "")
	s = strings.ReplaceAll(s, ".", "")
	return s
}

// unitSlug normalizes unit/champion names for map lookups.
func unitSlug(name string) string {
	s := strings.ToLower(name)
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	return b.String()
}
