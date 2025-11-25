package models

// BuilderData contains the data needed to display the builder page
type BuilderData struct {
	HexRows []int
	HexCols []int
}

// NewBuilderData creates a new instance of BuilderData with the default dimensions
func NewBuilderData() *BuilderData {
	return &BuilderData{
		HexRows: MakeRange(0, 4),
		HexCols: MakeRange(0, 7),
	}
}

// MakeRange generates a slice of integers from min to max (exclusive)
func MakeRange(min, max int) []int {
	result := make([]int, max-min)
	for i := range result {
		result[i] = min + i
	}
	return result
}
