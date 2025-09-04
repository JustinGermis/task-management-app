# TaskFlow Design Principles

## Core UI/UX Guidelines for Professional Application Development

### 🎯 **Button & Icon Layout Principles**

#### **CRITICAL: Icons Must Always Be Inline**
- ❌ **NEVER stack icons above text** (`flex-col`, vertical layouts)
- ✅ **ALWAYS place icons inline with text** (`flex items-center`, horizontal layouts)

```jsx
// ❌ WRONG - Don't do this
<Button>
  <div className="flex flex-col items-start">
    <Plus className="h-4 w-4" />
    <span>Button Text</span>
  </div>
</Button>

// ✅ CORRECT - Always do this
<Button asChild>
  <Link className="flex items-center">
    <Plus className="h-4 w-4 mr-2" />
    Button Text
  </Link>
</Button>
```

#### **Standard Button Patterns**
- Use `justify-start` for left-aligned buttons
- Use `mr-2` or `mr-3` for icon spacing
- Use `h-4 w-4` for standard icon sizes
- Use `shrink-0` on icons to prevent squashing

### 🎨 **Visual Hierarchy & Information Architecture**

#### **Dashboard Metrics Priority**
1. **Urgent/Critical** (Red) - Overdue tasks, blockers
2. **Active Work** (Blue) - In progress, current focus
3. **Progress/Success** (Green) - Completion rates, achievements
4. **Neutral Info** (Gray) - General stats, secondary data

#### **Color Coding System**
- **Red/Destructive**: Urgent actions, overdue items, errors
- **Blue/Primary**: Active tasks, current work, navigation
- **Green/Emerald**: Progress, completion, success states
- **Orange/Warning**: Attention needed, moderate priority
- **Gray/Muted**: Secondary information, neutral states

### 📐 **Layout & Spacing Standards**

#### **Card Design Patterns**
- Use gradient headers for section differentiation
- Add icon badges in headers for visual identity
- Use `overflow-hidden` on cards with special styling
- Add subtle borders or shadows for depth

#### **Spacing Consistency**
- `space-y-3` or `space-y-4` for vertical rhythm
- `gap-3` or `gap-6` for grid layouts
- `px-6 py-4` for card content padding
- `mr-2` for inline icon spacing

### 🏗️ **Component Architecture**

#### **Professional Card Structure**
```jsx
<Card className="overflow-hidden">
  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
    <div className="flex items-center space-x-2">
      <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
        <Icon className="h-4 w-4 text-blue-600" />
      </div>
      <div>
        <CardTitle>Section Title</CardTitle>
        <CardDescription>Section description</CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent className="p-0">
    {/* Content with proper padding */}
  </CardContent>
</Card>
```

#### **Action Button Guidelines**
- Primary actions: Use solid buttons with proper contrast
- Secondary actions: Use outline buttons
- Destructive actions: Use red/destructive variant
- Always include hover states and transitions

### 🎭 **Interaction Design**

#### **Hover Effects & Transitions**
- Use `transition-colors` for color changes
- Use `hover:bg-muted/50` for subtle backgrounds
- Use `group` and `group-hover:` for coordinated effects
- Add `hover:shadow-lg` for elevation on important buttons

#### **Loading & Empty States**
- Show skeleton loaders during data fetching
- Provide clear empty state messaging with actions
- Use consistent loading patterns across components

### 📱 **Responsive Design**

#### **Grid Breakpoints**
- `sm:grid-cols-2` for mobile-first responsive grids
- `lg:grid-cols-3` or `lg:grid-cols-4` for larger screens
- Use `hidden sm:block` for progressive disclosure

#### **Mobile Considerations**
- Ensure touch targets are at least 44px
- Stack elements appropriately on small screens
- Maintain readable font sizes and spacing

### ✨ **Professional Polish Details**

#### **Typography Hierarchy**
- Use `text-2xl font-bold tracking-tight` for page titles
- Use `text-lg` for section titles
- Use `text-sm font-semibold` for item titles
- Use `text-xs text-muted-foreground` for metadata

#### **Badge & Status Design**
- Use consistent badge variants for status
- Match badge colors to their semantic meaning
- Keep badge text concise and clear

#### **Visual Consistency Checklist**
- [ ] All icons are inline with text (never stacked above)
- [ ] Consistent spacing using design tokens
- [ ] Proper color coding for different types of information
- [ ] Hover states and transitions on interactive elements
- [ ] Readable typography hierarchy
- [ ] Responsive grid layouts
- [ ] Professional card designs with appropriate visual weight

### 🚫 **Common Anti-Patterns to Avoid**

1. **Stacking icons above text** - Always use inline layouts
2. **Inconsistent spacing** - Use design system tokens
3. **Poor color contrast** - Ensure readability
4. **Missing hover states** - All interactive elements need feedback
5. **Overly complex layouts** - Keep it simple and scannable
6. **Raw data without context** - Always provide actionable insights
7. **Inconsistent button styles** - Use established patterns

### 🎯 **PM/UX Decision Framework**

#### **Information Priority Questions**
1. What does the user need to act on immediately?
2. What helps them make decisions quickly?
3. What provides progress/status context?
4. What are secondary/nice-to-have details?

#### **Action Design Questions**
1. Is this the most important action for this context?
2. Does the visual weight match the action importance?
3. Is the action clearly labeled and accessible?
4. Does it fit the established interaction patterns?

---

## 🔄 **Continuous Improvement**

This document should be updated as new patterns emerge and design decisions are made. Always prioritize:
1. **User needs** over visual flair
2. **Consistency** over novelty
3. **Accessibility** over aesthetics
4. **Performance** over complexity

---

*Last updated: Based on TaskFlow dashboard redesign learnings*


