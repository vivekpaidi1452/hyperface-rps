# Rock Paper Scissors Game

A multiplayer Rock Paper Scissors game built with React.js featuring a clean, modern UI and proper component architecture.

## Features

- 🎮 **Multiplayer Support**: 2-4 players
- 🏆 **Round-based Gameplay**: 3, 5, or 7 rounds per game
- 📊 **Score Tracking**: Real-time score updates
- 🎨 **Modern UI**: Beautiful gradient design with animations
- 📱 **Responsive Design**: Works on desktop and mobile
- 🔧 **Clean Architecture**: Proper component structure and separation of concerns

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Menu.js          # Game menu component
│   ├── GameBoard.js     # Main game board
│   ├── Player.js        # Individual player component
│   ├── Results.js       # Game results display
│   └── index.js         # Component exports
├── contexts/            # React Context for state management
│   └── GameContext.js   # Game state and actions
├── hooks/               # Custom React hooks
│   └── useGameLogic.js  # Game logic and statistics
├── utils/               # Utility functions and constants
│   └── gameUtils.js     # Game-related utilities
├── App.js               # Main application component
├── App.css              # Application styles
└── index.js             # Application entry point
```

## Component Architecture

### Context Layer
- **GameContext**: Manages global game state using React Context and useReducer
- Provides actions for starting games, making choices, and managing rounds

### Component Layer
- **Menu**: Game setup and configuration
- **GameBoard**: Main game interface with player components
- **Player**: Individual player choice interface
- **Results**: Final scores and round history

### Utility Layer
- **gameUtils**: Constants, helper functions, and game logic
- **useGameLogic**: Custom hooks for game effects and statistics

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm start
   ```

3. **Open browser**:
   Navigate to `http://localhost:3000`

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run format` - Format code with Prettier
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Game Rules

1. **Rock** beats **Scissors**
2. **Paper** beats **Rock**
3. **Scissors** beats **Paper**
4. **Tie** when all players choose the same option
5. **Tie** when all three different options are chosen

## Technologies Used

- **React 18** - UI library
- **React Context** - State management
- **CSS3** - Styling with modern features
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Development Features

- **ESLint Configuration**: Code quality and consistency
- **Prettier Integration**: Automatic code formatting
- **Component-based Architecture**: Reusable and maintainable code
- **Custom Hooks**: Reusable logic and effects
- **Responsive Design**: Mobile-first approach

## Future Enhancements

- [ ] Online multiplayer with WebSockets
- [ ] Player customization (names, avatars)
- [ ] Game statistics and history
- [ ] Tournament mode
- [ ] Sound effects and animations
- [ ] Dark/light theme toggle