# Landing Page Design System

## 1. Color Palette

### Primary Color
- **Main Green**: `#00a63e` (used for primary actions, brand elements, CTAs)
- **Darker Green**: `#029238` (hover states for primary buttons)
- **Deep Green**: `#016c28` (gradients, accents)

### Accent Colors
- **Emerald 50**: `#f0fdf4` (light backgrounds)
- **Emerald 200**: `oklch(0.85 0.2 145)` (subtle accents)
- **Emerald 400**: CSS utility (decorative elements)
- **Emerald 500**: CSS utility (secondary accents)
- **Emerald 900**: `rgba(0,166,62,0.x)` variations (overlays, shadows)

### Neutral Colors
- **Black**: `#000000` (overlays, contrast)
- **Gray 50-900**: Tailwind scale (text, borders, backgrounds)
- **White**: `#ffffff` (cards, surfaces)

### Background Colors
- **Hero Gradient**: `linear-gradient(135deg, #0d2818 0%, #0a1f14 30%, #071208 60%, #0a1f14 100%)` (dark sections)
- **Stats Gradient**: `linear-gradient(135deg, #00a63e 0%, #029238 40%, #016c28 100%)` (primary sections)
- **Light Gradient**: `linear-gradient(to bottom, white via #f0fdf4/30 to white)` (subtle sections)

### Surface Colors
- **Glass Effect**: `rgba(255, 255, 255, 0.08)` with `backdrop-blur(25px)`
- **Glass Navbar**: `rgba(0, 0, 0, 0.65)` with `backdrop-blur(30px)`
- **White with Opacity**: `white/10`, `white/15`, `white/20` (overlays)

### Border Colors
- **Primary Border**: `border-[#00a63e]`
- **Light Border**: `border-gray-200`
- **Dark Border**: `border-gray-800`
- **White Transparent**: `border-white/10`, `border-white/20`

### Text Colors
- **Primary Text**: `text-gray-900` (headings on light)
- **Secondary Text**: `text-gray-600`, `text-gray-500` (body text)
- **Muted Text**: `text-gray-400` (captions)
- **White Text**: `text-white` (on dark backgrounds)
- **White Muted**: `text-white/70`, `text-white/80`, `text-white/90`
- **Brand Text**: `text-[#00a63e]` (highlighted elements)

### Hover Colors
- **Primary Hover**: `hover:bg-[#029238]`
- **Glass Hover**: `hover:bg-white/15`
- **Scale Transform**: `hover:scale-105`, `hover:scale-110`
- **Text Hover**: `hover:text-[#00a63e]`, `hover:text-white`

### Active Colors
- **Button Active**: `active:bg-white/10`
- **Scale Down**: `whileTap={{ scale: 0.95 }}`

### Disabled Colors
- Not explicitly used in landing page

---

## 2. Typography

### Font Family
- **Default**: System font stack (inherited from Tailwind)
- **Serif**: Used for "Founder" cards and bounty descriptions
- **Mono**: `font-mono` for technical indicators (START/END frames)

### Heading Hierarchy
- **H1 (Hero)**: `text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.05]`
- **H2 (Section)**: `text-3xl sm:text-5xl lg:text-6xl font-black leading-tight`
- **H3 (Card Title)**: `text-xl sm:text-3xl font-black` or `text-lg font-black`
- **H4 (Subheading)**: `text-xl font-bold`

### Body Text
- **Large Body**: `text-xl text-gray-500 leading-relaxed`
- **Standard Body**: `text-base sm:text-xl leading-relaxed`
- **Small Body**: `text-sm text-gray-600 leading-relaxed`
- **Extra Small**: `text-xs text-gray-700 leading-relaxed`

### Caption Styles
- **Eyebrow**: `text-sm font-semibold text-gray-500 uppercase tracking-wider`
- **Badge**: `text-xs font-semibold text-white bg-[#00a63e] px-3 py-1 rounded-full`
- **Footer Caption**: `text-sm text-gray-500`

### Font Weights
- **Black**: `font-black` (900) - primary headings
- **Bold**: `font-bold` (700) - subheadings, buttons
- **Semibold**: `font-semibold` (600) - labels, badges
- **Medium**: `font-medium` (500) - navigation, body emphasis

### Letter Spacing
- **Wider**: `tracking-wider` (eyebrows, badges)
- **Wide**: `tracking-wide` (logo, brand text)
- **Widest**: `tracking-[0.2em]`, `tracking-[0.15em]` (mobile menu)

### Line Heights
- **Tight**: `leading-tight` (headings)
- **Snug**: `leading-[1.05]` (hero title)
- **Relaxed**: `leading-relaxed` (body text)

---

## 3. Spacing System

### Padding
- **Button**: `px-8 py-3.5`, `px-10 py-4` (CTAs)
- **Card**: `p-4 pb-8` (feature cards), `p-5 sm:p-6` (team cards)
- **Section**: `py-12 sm:py-20`, `py-16 sm:py-24`, `py-24` (vertical sections)
- **Container**: `px-4 sm:px-8 lg:px-12` (horizontal container)
- **Small Element**: `px-3 py-1`, `px-3 py-1.5`, `px-4 py-2` (badges)

### Margins
- **Section Header**: `mb-12 lg:mb-16`, `mb-8 sm:mb-16`
- **Card Bottom**: `mb-6`, `mb-3 sm:mb-4`
- **Element Gap**: `mb-2`, `mb-3`, `mb-4`, `mb-6`

### Section Spacing
- **Vertical**: `py-12 sm:py-24`, `py-16 sm:py-24`, `py-20 sm:py-24`
- **Between Sections**: Handled by individual section padding

### Card Spacing
- **Internal**: `p-4`, `p-5 sm:p-6`, `p-6 sm:p-8`
- **Content Gap**: `space-y-2.5`, `space-y-3`

### Component Spacing
- **Gap Between**: `gap-4`, `gap-6`, `gap-8`, `gap-2 sm:gap-8`
- **Stack Space**: `space-y-1.5 sm:space-y-2`, `space-y-2.5`

---

## 4. Border Radius

- **Small**: `rounded-sm` (image crops, small elements)
- **Medium**: `rounded-lg` (film frames, small cards)
- **Large**: `rounded-xl sm:rounded-2xl` (primary cards)
- **Extra Large**: `rounded-2xl` (major sections, containers)
- **Full**: `rounded-full` (buttons, badges, icons, dots)

---

## 5. Shadows

### Cards
- **Feature Card**: `shadow-2xl` + `box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 8px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.9)`
- **Film Frame**: `box-shadow: 0 8px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`
- **Team Card**: `drop-shadow(4px 4px 8px rgba(0,0,0,0.3))`
- **Pricing Card**: `shadow-sm` (default), `hover:shadow-xl`

### Buttons
- **Primary Button**: `shadow-[0_8px_32px_0_rgba(0,166,62,0.3)]`
- **Glass Button**: `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)`

### Modals
- Not explicitly defined in landing page

### Floating Elements
- **Blurred Glow**: `blur-xl`, `blur-2xl`, `blur-3xl` with `bg-black/20` or color variants

---

## 6. Buttons

### Primary CTA Button
- **Background**: `bg-[#00a63e]/80 backdrop-blur-md` or solid `bg-[#00a63e]`
- **Hover**: `hover:bg-[#00a63e]` (from 80%) or `hover:bg-[#029238]` (from solid)
- **Active**: `whileTap={{ scale: 0.95 }}`
- **Border**: None
- **Text**: `text-white font-semibold` or `font-bold`
- **Padding**: `px-8 py-3.5` or `px-10 py-4`
- **Radius**: `rounded-full`
- **Transition**: `transition-all duration-300`

### Secondary Button
- **Background**: `border-2 border-gray-200`
- **Hover**: `hover:border-[#00a63e] hover:text-[#00a63e]`
- **Text**: Default text color
- **Same padding/radius as primary**

### Icon Buttons (Social)
- **Background**: `bg-white/10`
- **Hover**: `hover:bg-[#00a63e]/20 hover:scale-110`
- **Size**: `w-10 h-10 rounded-full`
- **Transition**: `transition-all`

### Navigation Links
- **Background**: Transparent
- **Hover**: `hover:text-white hover:scale-105`
- **Text**: `text-white/90 font-medium text-sm uppercase tracking-wide`
- **Transition**: `transition-all duration-300`

---

## 7. Cards

### Design
- **Background**: `bg-white` or `bg-white/10 backdrop-blur-sm`
- **Borders**: `border-2 border-gray-200` or `border border-white/20`
- **Shadows**: `shadow-sm` to `shadow-2xl` depending on prominence
- **Spacing**: `p-4` to `p-7`

### Hover Effects
- **Transform**: `hover:-translate-y-2` (lift), `hover:scale-105`
- **Shadow**: `hover:shadow-xl`
- **Border**: `hover:border-[#00a63e]/60`
- **Filter**: `hover: brightness(1.1) contrast(1.05)`

### Special Cards
- **Glass Card**: `bg-white/10 backdrop-blur-sm border border-white/20`
- **Feature Photo**: White background with photo aesthetic (sepia filter, film grain)
- **Team Card**: Border-4 black, serif typography, push pins

---

## 8. Icons

### Icon Library
- **Lucide React**: Primary icon library
- **Custom SVG**: Social icons (Twitter, LinkedIn, Facebook)

### Sizes
- **Extra Small**: `w-3 h-3`, `w-3.5 h-3.5`
- **Small**: `w-4 h-4`
- **Medium**: `w-5 h-5`, `w-6 h-6`
- **Large**: `w-7 h-7`, `w-8 h-8`
- **Decorative**: Variable sizes (`w-4 h-4` to `w-7 h-7`)

### Colors
- **Primary**: `text-[#00a63e]`
- **White**: `text-white`, `text-white/70`
- **Muted**: `text-gray-400`, `text-gray-500`

### Usage Patterns
- Logo icon (Wheat) consistently paired with brand name
- Feature icons in stats section
- Decorative floating grains in hero
- Check icons for feature lists
- Lucide icons sized `w-4 h-4` to `w-6 h-6` for UI elements

---

## 9. Animation

### Transitions
- **Standard**: `transition-all duration-300`
- **Longer**: `transition-all duration-700`, `transition-all duration-1000`
- **Color Only**: `transition-colors duration-300`
- **Transform**: `transition-transform duration-1000 ease-in-out`

### Hover Animations
- **Scale Up**: `whileHover={{ scale: 1.05 }}` or `hover:scale-105`
- **Scale Down**: `whileTap={{ scale: 0.95 }}`
- **Lift**: `hover:-translate-y-2`
- **Rotate**: `whileHover={{ rotate: 0 }}` (from tilted state)

### Page Animations
- **Fade In Up**: `initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}`
- **Fade In Slide**: `initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }}`
- **Scale In**: `initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}`

### Framer Motion Usage
- **Staggered Reveals**: Section content fades in with increasing delay
- **Hero Title**: Sequential word-by-word animation with vertical slide
- **Scroll Indicator**: Continuous bounce animation
- **Carousel**: Exit/enter animations with slide and rotation

### Durations
- **Quick**: `0.4s`, `0.5s`, `0.6s`
- **Standard**: `1s`, `1.2s`, `1.4s`
- **Slow**: `2s`, `2.5s`, `3s`

### Easing
- **Ease Out**: Default Framer Motion easing
- **Ease In Out**: `ease-in-out` (CSS), `ease: 'easeInOut'` (Framer)
- **Custom**: `ease: [0.22, 1, 0.36, 1]`, `ease: [0.55, 0.085, 0.68, 0.53]`

### Custom Keyframe Animations
- `float-gentle`: 6s infinite gentle float
- `drift-left/right`: 7-8s infinite horizontal drift
- `photo-sway-1/2/3`: 7-9s infinite sway with slight rotation
- `rope-sway`: 12s infinite subtle rope movement
- `film-scroll`: 28s linear infinite horizontal scroll
- `perforations-scroll`: 28s linear infinite
- `projector-light`: Pulsing glow effect
- `skeleton-shimmer`: 1.4s loading state

---

## 10. Layout

### Content Width
- **Max Width**: `max-w-7xl` (most sections), `max-w-6xl` (team board), `max-w-4xl` (CTA), `max-w-3xl` (text blocks)
- **Container**: `container mx-auto` with responsive padding

### Grid System
- **Pricing**: `grid-cols-2 lg:grid-cols-4` (mobile 2x2, desktop 4 cols)
- **Team**: `grid-cols-3` (desktop only)
- **Responsive**: `grid-cols-2 md:grid-cols-3` patterns

### Section Layouts
- **Full Width Hero**: `h-screen w-full` with video background
- **Centered Content**: `max-w-7xl mx-auto` with `text-center`
- **Flex Layouts**: `flex flex-wrap justify-center gap-4/6/8`

### Responsiveness
- Mobile-first approach
- Breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Hidden/shown: `hidden md:flex`, `md:hidden`

### Breakpoints
- **sm**: 640px (small tablets)
- **md**: 768px (tablets)
- **lg**: 1024px (desktops)
- **xl**: 1280px (large desktops)

---

## 11. UI Components

### Hero
- Full-screen video background with multiple gradient overlays
- Bottom-left positioned content
- Animated scroll indicator
- Floating decorative grain icons with blur

### Navbar
- Fixed top position with glass morphism
- Transforms on scroll (fade in/out with perspective)
- Full-screen mobile menu with template-style close bar
- Logo + nav links + CTA structure

### Footer
- Dark background (`bg-black`)
- Grid layout with logo, links, social icons
- Border-top divider for bottom bar
- Copyright and policy links

### Feature Cards
- Clothesline metaphor with rope, clothespins, and hanging photos
- Photo-realistic styling with sepia filters
- Swaying animations
- Hover lift and brightness effects

### Statistics
- 2x2 grid on mobile, 4 columns on desktop
- Glass morphism cards on gradient background
- Animated number counters
- Icon + large number + label structure

### CTA Sections
- Dark gradient background with decorative blur elements
- Centered text + button layout
- Framer Motion viewport-triggered animations

---

## 12. Design Principles

1. **Green is Primary**: `#00a63e` used exclusively for primary actions, brand elements, and emphasis
2. **Cinematic Photography Aesthetic**: Feature cards styled as hanging Polaroids with film-strip How It Works section
3. **Glass Morphism**: Navigation and overlays use frosted glass effect with backdrop blur
4. **Soft Shadows**: Multiple layered shadows for depth (avoid harsh single shadows)
5. **Rounded Everything**: Buttons, cards, and containers use generous border radius (rarely sharp corners)
6. **High Whitespace**: Generous padding and spacing between elements
7. **Bold Typography**: Font-black for headings, clear hierarchy
8. **Smooth Animations**: All interactions have 300ms+ transitions
9. **Gradient Backgrounds**: Complex multi-stop gradients for visual interest
10. **Responsive Scaling**: Mobile gets 2-column layouts and carousels; desktop shows all content

---

## 13. Reusable Design Tokens

**Primary Color**: `#00a63e`  
**Primary Hover**: `#029238`  
**Dark Background**: `linear-gradient(135deg, #0d2818 0%, #0a1f14 30%, #071208 60%, #0a1f14 100%)`  
**Light Background**: `#f0fdf4`  
**Card Radius**: `rounded-2xl`  
**Button Radius**: `rounded-full`  
**Shadow Soft**: `shadow-sm`  
**Shadow Medium**: `shadow-xl`  
**Shadow Strong**: `shadow-2xl`  
**Transition**: `transition-all duration-300`  
**Border Light**: `border-gray-200`  
**Border Primary**: `border-[#00a63e]`  
**Background Glass**: `bg-white/10 backdrop-blur-sm border border-white/20`  
**Muted Text**: `text-gray-500`  
**Body Text**: `text-gray-600`  
**Heading Text**: `text-gray-900`  
**Success**: `text-[#00a63e]`  
**Danger**: Not defined in landing  
**Spacing Section**: `py-16 sm:py-24`  
**Spacing Container**: `px-4 sm:px-8 lg:px-12`  
**Hover Lift**: `hover:-translate-y-2 hover:shadow-xl`  
**Animation Delay**: Stagger by 0.1-0.2s increments  

---

## 14. Dashboard Mapping

### Sidebar
- Use glass effect similar to navbar: `glass-navbar-green` utility
- Brand color accent: `#00a63e` for active states
- Soft shadows instead of heavy borders
- Rounded navigation items

### Dashboard
- Light background: `#f0fdf4` or white
- Maximum whitespace between sections
- Glass cards for key metrics (similar to stats section)

### Tables
- Soft borders: `border-gray-200`
- Rounded corners: `rounded-lg` or `rounded-xl`
- Hover row: `hover:bg-gray-50`
- Primary actions in `#00a63e`

### Forms
- Input borders: `border-gray-200`
- Focus ring: `ring-[#00a63e]`
- Rounded inputs: `rounded-lg`
- Labels in `text-gray-700 font-medium`
- Success state: `border-[#00a63e]`

### Charts
- Use `#00a63e` as primary chart color
- Gradient fills from green palette
- Soft grid lines
- Rounded corners on bars

### Cards
- White background
- `shadow-sm` default, `hover:shadow-xl`
- `rounded-2xl`
- `p-6` internal padding
- Border on hover: `hover:border-[#00a63e]`

### Modals
- Backdrop: `bg-black/50 backdrop-blur-sm`
- Content: white with `rounded-2xl shadow-2xl`
- Slide-in animation
- Green primary buttons

### Alerts
- Success: `bg-[#00a63e]/10 border-[#00a63e] text-[#00a63e]`
- Error: `bg-red-50 border-red-300 text-red-700`
- Info: `bg-blue-50 border-blue-300 text-blue-700`
- Rounded: `rounded-lg`

### Buttons
- Primary: `bg-[#00a63e] text-white rounded-full px-6 py-3 hover:bg-[#029238]`
- Secondary: `border-2 border-gray-200 rounded-full px-6 py-3 hover:border-[#00a63e]`
- Soft shadows on primary: `shadow-[0_8px_32px_0_rgba(0,166,62,0.2)]`

### Navigation
- Top nav fixed with glass effect when scrolled
- Breadcrumbs in `text-gray-500 text-sm`
- Active link: `text-[#00a63e] font-semibold`

### Empty States
- Center-aligned
- Icon in `text-gray-400` large size
- Heading in `text-gray-900 font-bold`
- CTA in `#00a63e`

### Loading States
- Use `skeleton-shimmer` animation
- Gray placeholders: `bg-gray-200`
- Rounded matching actual content
- Spinner in `#00a63e`
