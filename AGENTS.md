# Project architecture rules

- Reuse tenant-keyed TanStack Query option factories for CRM records so route preloading and components share one cache.
- Use AlignPanel for feature dialogs and drawers; navigation menus remain purpose-built overlays.
- Page transitions animate only the incoming content and never wait for an outgoing page animation.
- Use the shared icon adapter for UI icons and the shared Button for actions; this keeps filled icon styling and accessible action labels consistent across modules.
- Render commercial summary metrics through AppShell using shared tenant query caches so every CRM screen stays aligned.
- Store account module restrictions in protected user_module_restrictions rows and enforce them through restrictive module RLS; navigation and route boundaries mirror the same permission.
- Keep company marketing in the campaigns workspace, linking editorial items to campaigns and deriving performance from recorded results.