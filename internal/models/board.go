package models

// BoardLayout holds the grid dimensions.
type BoardLayout struct {
	Rows int
	Cols int
}

// BoardRow stores metadata for a single row.
type BoardRow struct {
	Index  int
	Offset bool
}

// BoardView is the shape passed to templates to render the board.
type BoardView struct {
	Layout BoardLayout
	Rows   []BoardRow
	Cols   []int
}

// NewBoardView builds a board description with computed offsets.
func NewBoardView(rows, cols int) BoardView {
	if rows < 0 {
		rows = 0
	}
	if cols < 0 {
		cols = 0
	}

	layout := BoardLayout{Rows: rows, Cols: cols}

	boardRows := make([]BoardRow, rows)
	for i := 0; i < rows; i++ {
		boardRows[i] = BoardRow{
			Index:  i,
			Offset: i%2 == 1,
		}
	}

	return BoardView{
		Layout: layout,
		Rows:   boardRows,
		Cols:   MakeRange(0, cols),
	}
}
