# Cricket Scorer PWA

A Progressive Web App for professional ball-by-ball cricket scoring with offline support.

## Features

- 🏏 Ball-by-ball scoring with full event tracking
- 📊 Real-time statistics and run rates
- 📱 Works offline (PWA)
- 💾 Local data persistence with IndexedDB
- ↩️ Undo/Redo functionality
- 📤 Export/Share scorecards

## Project Structure

```
cricket-scorer/
├── index.html           # Main HTML entry point
├── app.js               # Main application orchestrator
├── style.css            # Application styles
├── manifest.json        # PWA manifest
├── service-worker.js    # Service worker for offline support
├── models/              # Data models
│   ├── Player.js        # Player with stats
│   ├── Team.js          # Team with players
│   ├── BallEvent.js     # Core ball event (extras, wickets)
│   ├── Over.js          # Container for balls
│   ├── Innings.js       # Full innings state
│   └── Match.js         # Top-level match container
├── engines/             # Cricket logic
│   ├── ScoringEngine.js # Ball recording & state updates
│   ├── StatsEngine.js   # Statistics calculations
│   └── RulesEngine.js   # Validation & game rules
├── services/            # Application services
│   ├── StorageService.js # IndexedDB persistence
│   └── UndoService.js   # Undo/Redo management
├── ui/                  # UI components
│   ├── MatchSetup.js    # Match creation wizard
│   ├── ScoringUI.js     # Ball-by-ball scoring pad
│   └── ScorecardUI.js   # Scorecard display
└── icons/               # App icons
```

## Architecture

### Core Principle
> "Cricket scorer = event timeline + rules engine"

Everything derives from `BallEvent`. Stats are calculated, never stored.

### Data Flow
1. User taps run/wicket on ScoringUI
2. ScoringEngine validates via RulesEngine
3. ScoringEngine creates immutable BallEvent
4. Innings state updates (strike, batsmen, etc.)
5. StatsEngine recalculates all derived stats
6. UI refreshes with new state
7. StorageService persists to IndexedDB

## Getting Started

### Development

1. Serve the project locally:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve
   ```

2. Open http://localhost:8000 in your browser

### Installation (PWA)

1. Open the app in a supported browser (Chrome, Edge, Safari)
2. Click "Install" when prompted, or use browser menu → "Install App"

## Usage

1. **Create Match**: Set match type, overs, teams, and toss
2. **Start Innings**: Select opening batsmen and bowler
3. **Score**: Tap runs (0-6), extras (Wd, Nb, B, Lb), or wicket
4. **View Stats**: Tap Scorecard for full batting/bowling stats
5. **Undo**: Use undo button if you make a mistake

## Technical Details

- **Storage**: IndexedDB with localStorage fallback
- **Offline**: Service worker caches all assets
- **State**: Immutable ball events, derived statistics
- **Export**: JSON match data, shareable text scorecards

## License

MIT
