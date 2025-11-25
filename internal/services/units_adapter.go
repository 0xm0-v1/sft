package services

import (
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
