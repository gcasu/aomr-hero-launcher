import { NavigationItem } from '../models/navigation.model';

export const NAVIGATION_CONFIG: NavigationItem[] = [
  {
    id: 'home',
    label: 'NAVIGATION.HOME',
    icon: 'fas fa-home',
    route: '/home',
    type: 'link'
  },
  {
    id: 'modding',
    label: 'NAVIGATION.MODDING',
    icon: 'fas fa-tools',
    items: [
      {
        id: 'my-mods',
        label: 'NAVIGATION.MY_MODS',
        icon: 'fas fa-puzzle-piece',
        route: '/my-mods',
        type: 'link'
      },
      {
        id: 'resources',
        label: 'NAVIGATION.RESOURCES',
        icon: 'fas fa-globe',
        route: '/resources',
        type: 'link'
      },
      {
        id: 'replay-parser',
        label: 'NAVIGATION.REPLAY_PARSER',
        icon: 'fas fa-file-code',
        route: '/replay-parser',
        type: 'link'
      },
      {
        id: 'data-guide',
        label: 'NAVIGATION.CORE_DATA_GUIDE',
        icon: 'fas fa-book-open',
        route: '/data-guide',
        type: 'link'
      }
    ]
  },
  {
    id: 'competitive',
    label: 'NAVIGATION.COMPETITIVE',
    icon: 'fas fa-trophy',
    items: [
      {
        id: 'leaderboard',
        label: 'NAVIGATION.LEADERBOARD',
        icon: 'fas fa-crown',
        route: '/leaderboard',
        type: 'link'
      },
      {
        id: 'tiers',
        label: 'NAVIGATION.TIERS',
        icon: 'fas fa-layer-group',
        route: '/tiers',
        type: 'link'
      },
      {
        id: 'build-orders',
        label: 'NAVIGATION.BUILD_ORDERS',
        icon: 'fas fa-hammer',
        route: '/build-orders',
        type: 'link'
      },
      {
        id: 'youtube-feed',
        label: 'NAVIGATION.YOUTUBE_FEED',
        icon: 'fab fa-youtube',
        route: '/youtube-feed',
        type: 'link'
      }
    ]
  },
  {
    id: 'settings',
    label: 'NAVIGATION.SETTINGS',
    icon: 'fas fa-cog',
    route: '/settings',
    type: 'link'
  }
];
