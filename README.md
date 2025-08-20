# AoM:R Hero Launcher

Age of Mythology: Retold Launcher built with Electron 37, Angular 20, and ng-bootstrap 19.

## Features

- **Game Launcher**: Launch Age of Mythology: Retold directly from the application with configurable game paths
- **Mod Management**: Install, organize, and manage local and Steam Workshop mods with priority settings and compatibility features
- **Interactive Tier Lists**: Create and customize tier rankings for major and minor gods with drag-and-drop functionality
- **YouTube Feed**: Browse and watch the latest Age of Mythology content from community creators and channels
- **Build Orders**: Access strategic build order guides organized by major god selection
- **Core Data Guide**: Explore comprehensive game data, statistics, and reference information with search and bookmarking
- **Leaderboard**: View competitive 1v1 supremacy player rankings, ELO ratings, and match statistics
- **Resource Browser**: Discover and access community guides, modding tools, and external resources with filtering
- **Advanced Settings**: Configure game paths, mod directories, user.cfg parameters, and application preferences
- **Cache Management**: Clear application data and reload for troubleshooting and performance optimization

## Project Structure

```
aom-launcher/
├── src/
│   ├── app/
│   │   ├── pages/
│   │   │   ├── home/                 # Landing page with feature carousel
│   │   │   ├── my-mods/              # Mod management interface
│   │   │   ├── resources/            # Searchable resources with filtering
│   │   │   ├── data-guide/           # Game data reference
│   │   │   ├── leaderboard/          # Player rankings
│   │   │   ├── build-orders/         # Major god selection for build orders
│   │   │   ├── tiers/                # Interactive drag-drop tier lists with race condition protection
│   │   │   ├── youtube-feed/         # Real-time YouTube content feed
│   │   │   └── settings/             # Application configuration
│   │   ├── services/                 # Core application services
│   │   │   ├── mod.service.ts        # Mod management logic
│   │   │   ├── navigation.service.ts # Navigation state management
│   │   │   ├── toast.service.ts      # Notification system
│   │   │   ├── scroll.service.ts     # Scroll behavior management
│   │   │   ├── leaderboard.service.ts # Player ranking data management
│   │   │   └── youtube-feed.service.ts # YouTube RSS feed integration with Electron APIs
│   │   ├── interfaces/               # TypeScript interfaces
│   │   │   ├── major-god.interface.ts
│   │   │   ├── carousel.interface.ts
│   │   │   └── resources.interface.ts
│   │   ├── data/                     # Static data files
│   │   │   ├── major-gods.data.ts    # Major god definitions
│   │   │   └── mock-mods.json        # Sample mod data
│   │   ├── shared/                   # Reusable components
│   │   │   ├── badge/                # Status badge component
│   │   │   ├── glass-card/           # Glassmorphism card component
│   │   │   ├── page-container/       # Standard page layout
│   │   │   ├── page-header/          # Page title and description
│   │   │   ├── search-filter/        # Advanced search functionality
│   │   │   └── toast-container/      # Notification display
│   │   ├── app.component.*
│   │   ├── app.module.ts
│   │   └── app-routing.module.ts
│   ├── assets/
│   │   ├── i18n/                     # Translation files
│   │   ├── images/                   # Game assets and UI images
│   │   ├── fonts/                    # Custom fonts (Maiola)
│   │   └── config/                   # Configuration files
│   ├── environments/
│   └── styles.scss
├── main.ts (Electron main process)
├── preload.js (Electron preload script)
├── package.json
└── angular.json
```

## Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Development Mode**
   ```bash
   # Terminal 1: Start Angular dev server
   ng serve
   
   # Terminal 2: Start Electron in dev mode
   npm run electron:dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Package Electron App**
   ```bash
   npm run package
   ```

## Available Scripts

- `npm start` - Start the application
- `npm run electron` - Build Angular and start Electron
- `npm run electron:dev` - Start Electron in development mode
- `npm run build` - Build Angular application
- `npm run package` - Package Electron application for distribution
- `npm run dist` - Build and package application for distribution
- `npm test` - Run unit tests
- `ng serve` - Start Angular development server

## Pages

### Home
Landing page with feature carousel, one-click game launcher, and community links including Discord and GitHub.

### My Mods
Comprehensive mod management interface with local and Steam Workshop mod organization, priority settings, enable/disable toggles, and experimental simdata merger functionality.

### Resources
Community resource browser with web links and downloadable content, featuring advanced search and filtering by title, author, and resource type.

### Data Guide
Interactive core game data reference with search functionality, bookmark system, personal notes, and comprehensive parameter exploration with copy-to-clipboard features.

### Leaderboard
1v1 supremacy competitive rankings displaying player ELO ratings, win rates, streaks, and detailed match statistics with search and pagination.

### Build Orders
Strategic build order guides organized by major god selection with visual god picker interface.

### Tier Lists
Interactive tier list creator with drag-and-drop functionality for ranking major and minor gods, featuring auto-save and reset capabilities.

### YouTube Feed
Real-time feed aggregator displaying latest videos from Age of Mythology content creators with channel search and filtering options.

### Settings
Advanced configuration panel for game executable paths, mod directory setup, user.cfg parameter management, and application cache clearing with automatic reload functionality.

## Technologies Used

- **Electron 37** - Desktop application framework with native OS integration
- **Angular 20** - Modern frontend framework with standalone components
- **ng-bootstrap 19** - Bootstrap components optimized for Angular
- **Angular CDK** - Component Development Kit for advanced UI interactions
- **Angular Router** - Client-side routing with lazy loading and route guards
- **Angular Translate** - Comprehensive internationalization with HTML parsing
- **RxJS** - Reactive programming for state management and async operations
- **Bootstrap 5** - Modern CSS framework with utility classes
- **SCSS** - Advanced CSS preprocessing with mixins and variables
- **TypeScript** - Strongly typed programming language
- **FontAwesome** - Icon library for consistent UI elements
- **Custom Fonts** - Maiola font integration for authentic Age of Mythology styling

## Architecture

- **Modular Design**: Each page is a separate lazy-loaded module with standalone components
- **Service-Oriented**: Core functionality separated into dedicated services (mod, navigation, toast, scroll, leaderboard, youtube-feed)
- **Native Integration**: Electron IPC communication for file system access, external launching, and network requests
- **Drag-Drop Reliability**: Enhanced drag-and-drop system with race condition protection and item tracking
- **Component Separation**: Clean separation of concerns with dedicated interfaces and data files
- **Translation Ready**: All text uses translation keys with support for HTML content
- **State Management**: Reactive state management using RxJS observables and local storage persistence
- **Responsive Layout**: Mobile-first design with glassmorphism effects and adaptive layouts
- **Performance Optimized**: Lazy loading, change detection strategies, and efficient asset management
- **High-Resolution Assets**: Multi-format icon support (ICO, PNG) for optimal display across platforms
- **Scalable Structure**: Easy to add new pages, features, and extend existing functionality
- **Type Safety**: Comprehensive TypeScript interfaces and models for all data structures

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
