# Cricket Scorer

A Progressive Web App for ball-by-ball cricket scoring with offline support.

## Features

- Ball-by-ball scoring with event tracking
- Real-time statistics and run rates
- Works offline (PWA)
- Local data persistence
- Undo/Redo functionality
- Export and share scorecards

## Getting Started

### Development

Serve locally:
```bash
python -m http.server 8000
# or
npx serve
```

Then open http://localhost:8000 in your browser.

### Installation

Open the app in a supported browser (Chrome, Edge, Safari) and install when prompted.

## Usage

1. Create a match (type, overs, teams)
2. Start innings (select opening batsmen and bowler)
3. Score runs, extras, or wickets
4. View stats in the scorecard
5. Use undo if needed

## Architecture

- **models/**: Data models (Player, Team, Match, etc.)
- **engines/**: Cricket logic (ScoringEngine, RulesEngine, StatsEngine)
- **services/**: Storage and undo management
- **ui/**: UI components (MatchSetup, ScoringUI, ScorecardUI)

## License

MIT
