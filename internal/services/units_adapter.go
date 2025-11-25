package services

import (
	"math"
	"sft/internal/models"
	"strings"
)

func adaptChampion(ch setChampion, traitIcons, unitImages, spellImages map[string]string) (models.Unit, bool) {
	name := strings.TrimSpace(ch.Name)

	imgKey := unitSlug(name)
	img := unitImages[imgKey]
	if img == "" {
		// try apiName as fallback
		img = unitImages[unitSlug(ch.APIName)]
	}

	unit := models.Unit{
		Name:              name,
		Cost:              ch.Cost,
		Unlock:            ch.Unlock,
		UnlockDescription: ch.UnlockDescription,
		Role:              ch.Role,
		URL:               img, // fallback set later if empty
	}

	for _, t := range ch.Traits {
		slug := traitSlug(t)
		unit.Traits = append(unit.Traits, models.Trait{
			Name: t,
			Icon: traitIcons[slug],
		})
	}

	spellIcon := spellImages[imgKey]
	if spellIcon == "" {
		spellIcon = spellImages[unitSlug(ch.APIName)]
	}
	if spellIcon == "" {
		spellIcon = spellImages[unitSlug(ch.Ability.SpellKey)]
	}

	unit.Ability = adaptAbility(ch.Ability, spellIcon)
	unit.Stats = adaptStats(ch.Stats)

	// if no local image found, use portrait from source as fallback
	if unit.URL == "" {
		unit.URL = ch.Icons.Portrait
	}
	// still nothing usable? skip to avoid broken thumbnails
	if unit.URL == "" {
		return models.Unit{}, false
	}

	return unit, true
}

func adaptStats(stats setStats) models.UnitStats {
	return models.UnitStats{
		HP:             roundList(stats.HP.Numbers()),
		Damage:         roundList(stats.Damage.Numbers()),
		Armor:          roundToInt(stats.Armor),
		MagicResist:    roundToInt(stats.MagicResist),
		AttackSpeed:    stats.AttackSpeed,
		CritChance:     stats.CritChance,
		CritMultiplier: stats.CritMultiplier,
		Mana:           roundToInt(stats.Mana),
		InitialMana:    roundToInt(stats.InitialMana),
		Range:          roundToInt(stats.Range),
		AbilityPower:   100,
	}
}

func roundToInt(v float64) int {
	if v == 0 {
		return 0
	}
	return int(math.Round(v))
}

func roundList(values []float64) []int {
	if len(values) == 0 {
		return nil
	}
	out := make([]int, 0, len(values))
	for _, v := range values {
		out = append(out, roundToInt(v))
	}
	return out
}
