# Project architecture rules

- Reuse tenant-keyed TanStack Query option factories for CRM records so route preloading and components share one cache.
- Use AlignPanel for feature dialogs and drawers; navigation menus remain purpose-built overlays.
- Page transitions animate only the incoming content and never wait for an outgoing page animation.