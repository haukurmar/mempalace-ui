# React & TypeScript Best Practices

This document outlines the best practices for writing React and TypeScript code.

## TypeScript Guidelines

- Always use arrow functions when possible instead of regular functions
- Prefer types over interfaces for consistency
- Use proper type annotations for all variables and functions
- Always use `FC` type for React components, imported directly from React (not `React.FC`)
- For components with children, use `FC<PropsWithChildren<ComponentProps>>`
- Always use the `type` keyword when importing types (e.g., `import type { SomeType } from './types'`)

## Framer motion

- Use framer motion for animations
- Use the `motion` component from `motion/react` (the modern import path)
- Always use variants instead of inline animations

## React Component Guidelines

- When creating components that have props, always create a type for the props
- Never destructure props in the args of the function, rather destructure the props object directly in the function body
- Always export components as a named export, except for framework pages that require default exports
- When using React features, import them directly (e.g., `import { useState } from 'react'` instead of using `React.useState`)
- Avoid inline event handlers; always create named arrow functions (e.g., `const handleClick = () => {...}`)

## Example of a Well-Structured Component

```tsx
import { type FC, useState } from "react";
import type { ButtonProps } from "@memui/ui";
import { Button } from "@memui/ui";

type ExampleComponentProps = {
  title: string;
  onAction: (id: string) => void;
  buttonProps?: ButtonProps;
};

export const ExampleComponent: FC<ExampleComponentProps> = (props) => {
  const { title, onAction, buttonProps } = props;
  const [isActive, setIsActive] = useState(false);

  const handleButtonClick = () => {
    setIsActive(!isActive);
    onAction("example-id");
  };

  return (
    <div>
      <h2>{title}</h2>
      <Button onClick={handleButtonClick} {...buttonProps}>
        {isActive ? "Active" : "Inactive"}
      </Button>
    </div>
  );
};
```

## Example with Children

```tsx
import { FC, PropsWithChildren } from "react";
import type { HTMLAttributes } from "react";

type CardProps = {
  title: string;
  className?: string;
} & Pick<HTMLAttributes<HTMLDivElement>, "id" | "aria-label">;

export const Card: FC<PropsWithChildren<CardProps>> = (props) => {
  const { title, className, children, ...rest } = props;

  return (
    <div className={`card ${className || ''}`} {...rest}>
      <h3 className="card-title">{title}</h3>
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};
```

## General Code Style & Formatting

- Follow the Airbnb Style Guide for code formatting
- Use PascalCase for React component file names (e.g., `DrawerCard.tsx`, not `drawer-card.tsx`)
- Prefer named exports for components (unless the framework requires a default export, like Next.js pages)

### Linting and Formatting

The project uses Biome for linting and formatting:

- Configuration in `biome.jsonc` files
- Shared configuration lives in a workspace `biome-config` package and is extended by each app/package's local `biome.jsonc`

## Styling & UI

- Use Tailwind CSS for styling
- Use shadcn UI as the primitive layer; never use shadcn primitives directly in pages — wrap them in named composed components first

## Data Fetching & Forms

- Use TanStack Query (`@tanstack/react-query`) for client-side data fetching and cache management

---

# Component Composition & Size Guidelines

## When to Break Down Components

Components should be broken down into smaller pieces when:

- ❌ **Too many responsibilities**: Handles data fetching + form handling + rendering + state management
- ❌ **Multiple conditional renders**: Has separate Loading, Error, Success, Empty states
- ❌ **List rendering without Item components**: Maps through data with inline JSX
- ❌ **Exceeds ~100 lines**: Hard to read and understand at a glance
- ❌ **Multiple useState calls**: More than 3-4 state variables
- ❌ **Hard to name**: Generic names like "Manager", "Handler", "Container" suggest too many concerns

## Critical Patterns

### 1. Extract Conditional State Components

When you have multiple conditional renders (Loading, Error, Success, Empty), **always extract them into separate components**.

#### ❌ Wrong: All states in one component

```tsx
export const DrawerList: FC = () => {
  const { data: drawers, isLoading, error } = useDrawers();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
        <p className="ml-2">Loading drawers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="text-red-800 font-semibold">Error loading drawers</h3>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  if (!drawers || drawers.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No drawers found in this room</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {drawers.map((drawer) => (
        <DrawerCard key={drawer.id} drawer={drawer} />
      ))}
    </div>
  );
};
```

#### ✅ Correct: Extract state components into separate files

```tsx
// components/drawers/DrawerListLoading.tsx
import { type FC } from "react";
import { Spinner } from "@memui/ui";

export const DrawerListLoading: FC = () => {
  return (
    <div className="flex items-center justify-center p-8">
      <Spinner size="lg" />
      <p className="ml-2">Loading drawers...</p>
    </div>
  );
};
```

```tsx
// components/drawers/DrawerListError.tsx
import { type FC } from "react";

type DrawerListErrorProps = {
  error: Error;
};

export const DrawerListError: FC<DrawerListErrorProps> = (props) => {
  const { error } = props;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <h3 className="text-red-800 font-semibold">Error loading drawers</h3>
      <p className="text-red-600">{error.message}</p>
    </div>
  );
};
```

```tsx
// components/drawers/DrawerListEmpty.tsx
import { type FC } from "react";

export const DrawerListEmpty: FC = () => {
  return (
    <div className="text-center p-8">
      <p className="text-gray-500">No drawers found in this room</p>
    </div>
  );
};
```

```tsx
// components/drawers/DrawerList.tsx
import { type FC } from "react";
import { useDrawers } from "@/hooks/useDrawers";
import { DrawerCard } from "./DrawerCard";
import { DrawerListLoading } from "./DrawerListLoading";
import { DrawerListError } from "./DrawerListError";
import { DrawerListEmpty } from "./DrawerListEmpty";

export const DrawerList: FC = () => {
  const { data: drawers, isLoading, error } = useDrawers();

  if (isLoading) return <DrawerListLoading />;
  if (error) return <DrawerListError error={error} />;
  if (!drawers || drawers.length === 0) return <DrawerListEmpty />;

  return (
    <div className="grid grid-cols-1 gap-4">
      {drawers.map((drawer) => (
        <DrawerCard key={drawer.id} drawer={drawer} />
      ))}
    </div>
  );
};
```

### 2. Always Create Item Components for Lists

When mapping through data, **never use inline JSX**. Always create a dedicated Item component.

#### ❌ Wrong: Inline list rendering

```tsx
export const DrawerList: FC = () => {
  const { data: drawers } = useDrawers();

  return (
    <div className="space-y-4">
      {drawers?.map((drawer) => (
        <div key={drawer.id} className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{drawer.snippet}</h3>
              <p className="text-sm text-gray-600">{drawer.room}</p>
            </div>
            <Badge variant={drawer.miningMode === "convos" ? "warning" : "info"}>
              {drawer.miningMode}
            </Badge>
          </div>
          <div className="mt-2 flex gap-2">
            <Button onClick={() => handleEdit(drawer.id)}>Edit</Button>
            <Button variant="secondary" onClick={() => handleDelete(drawer.id)}>
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

#### ✅ Correct: Dedicated Item component in separate file

```tsx
// components/drawers/DrawerItem.tsx
import { type FC } from "react";
import type { Drawer, DrawerId } from "@memui/palace-types";
import { Button, Badge } from "@memui/ui";

type DrawerItemProps = {
  drawer: Drawer;
  onEdit: (id: DrawerId) => void;
  onDelete: (id: DrawerId) => void;
};

export const DrawerItem: FC<DrawerItemProps> = (props) => {
  const { drawer, onEdit, onDelete } = props;

  const handleEdit = () => {
    onEdit(drawer.id);
  };

  const handleDelete = () => {
    onDelete(drawer.id);
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{drawer.snippet}</h3>
          <p className="text-sm text-gray-600">{drawer.room}</p>
        </div>
        <Badge variant={drawer.miningMode === "convos" ? "warning" : "info"}>
          {drawer.miningMode}
        </Badge>
      </div>
      <div className="mt-2 flex gap-2">
        <Button onClick={handleEdit}>Edit</Button>
        <Button variant="secondary" onClick={handleDelete}>Delete</Button>
      </div>
    </div>
  );
};
```

```tsx
// components/drawers/DrawerList.tsx
import { type FC } from "react";
import type { DrawerId } from "@memui/palace-types";
import { useDrawers, useDeleteDrawer } from "@/hooks/useDrawers";
import { DrawerItem } from "./DrawerItem";

export const DrawerList: FC = () => {
  const { data: drawers } = useDrawers();
  const { mutate: deleteDrawer } = useDeleteDrawer();

  const handleEdit = (id: DrawerId) => {
    // open editor
  };

  const handleDelete = (id: DrawerId) => {
    deleteDrawer({ id });
  };

  return (
    <div className="space-y-4">
      {drawers?.map((drawer) => (
        <DrawerItem
          key={drawer.id}
          drawer={drawer}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};
```

### 3. Make Components Composable

Design components to be flexible and reusable through composition patterns.

#### ❌ Wrong: Monolithic, inflexible component

```tsx
type DrawerCardProps = {
  drawer: Drawer;
  showActions: boolean;
  showProvenance: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

export const DrawerCard: FC<DrawerCardProps> = (props) => {
  const { drawer, showActions, showProvenance, onEdit, onDelete } = props;

  return (
    <div className="rounded-lg border p-4">
      {showProvenance && <ProvenanceLine drawer={drawer} />}
      <h3>{drawer.snippet}</h3>
      <p>{drawer.room}</p>
      {showActions && (
        <div className="flex gap-2">
          {onEdit && <Button onClick={onEdit}>Edit</Button>}
          {onDelete && <Button onClick={onDelete}>Delete</Button>}
        </div>
      )}
    </div>
  );
};
```

#### ✅ Correct: Composable component structure

```tsx
type DrawerCardProps = {
  drawer: Drawer;
};

type DrawerCardHeaderProps = {
  drawer: Drawer;
};

type DrawerCardActionsProps = {
  children: React.ReactNode;
};

const DrawerCardHeader: FC<DrawerCardHeaderProps> = (props) => {
  const { drawer } = props;

  return (
    <div className="flex items-center gap-3">
      <div>
        <h3 className="font-semibold">{drawer.snippet}</h3>
        <p className="text-sm text-gray-600">{drawer.room}</p>
      </div>
    </div>
  );
};

const DrawerCardActions: FC<DrawerCardActionsProps> = (props) => {
  const { children } = props;

  return (
    <div className="mt-4 flex gap-2">
      {children}
    </div>
  );
};

// Main component accepts children for flexibility
export const DrawerCard: FC<PropsWithChildren<DrawerCardProps>> = (props) => {
  const { drawer, children } = props;

  return (
    <div className="rounded-lg border p-4">
      <DrawerCardHeader drawer={drawer} />
      {children}
    </div>
  );
};

// Compose components together based on needs
DrawerCard.Header = DrawerCardHeader;
DrawerCard.Actions = DrawerCardActions;

// Usage examples:
// Simple version
<DrawerCard drawer={drawer} />

// Full version with actions
<DrawerCard drawer={drawer}>
  <DrawerCard.Actions>
    <Button onClick={handleEdit}>Edit</Button>
    <Button onClick={handleDelete}>Delete</Button>
  </DrawerCard.Actions>
</DrawerCard>

// Custom composition
<DrawerCard drawer={drawer}>
  <ProvenanceFooter drawer={drawer} />
  <DrawerCard.Actions>
    <CustomButton />
  </DrawerCard.Actions>
</DrawerCard>
```

### 4. Extract Complex Logic into Custom Hooks

When components have complex state management, extract it into custom hooks.

#### ❌ Wrong: All logic in component with manual validation

```tsx
export const DrawerEditForm: FC = () => {
  const [content, setContent] = useState("");
  const [room, setRoom] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate: submit } = useUpdateDrawer();

  const handleSubmit = async () => {
    // Manual validation - BAD!
    const newErrors = {};
    if (!content) newErrors.content = "Content is required";
    if (!room) newErrors.room = "Room is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await submit({ content, room });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form>
      {/* Complex form with validation logic mixed in */}
    </form>
  );
};
```

#### ✅ Correct: Extract hook with Zod validation

```tsx
// hooks/useDrawerEditForm.ts
import { useState } from "react";
import { z } from "zod";
import { useUpdateDrawer } from "@/hooks/useDrawers";

// Define Zod schema for validation
const drawerEditSchema = z.object({
  content: z.string().min(1, "Content is required"),
  room: z.string().min(1, "Room is required"),
});

// Infer type from Zod schema
type DrawerEditFormData = z.infer<typeof drawerEditSchema>;

export const useDrawerEditForm = () => {
  const { mutate: submit } = useUpdateDrawer();

  // Form state
  const [formData, setFormData] = useState<DrawerEditFormData>({
    content: "",
    room: "",
  });

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Type-safe field updates
  const handleChange = (field: keyof DrawerEditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when field changes
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate using Zod
  const validateForm = (): boolean => {
    try {
      drawerEditSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          formattedErrors[path] = err.message;
        });
        setErrors(formattedErrors);
      }
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await submit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
  };
};
```

```tsx
// components/drawers/DrawerEditForm.tsx
import { type FC } from "react";
import { Input, Button } from "@memui/ui";
import { useDrawerEditForm } from "@/hooks/useDrawerEditForm";

export const DrawerEditForm: FC = () => {
  const { formData, errors, isSubmitting, handleChange, handleSubmit } = useDrawerEditForm();

  return (
    <form>
      <Input
        label="Content"
        value={formData.content}
        onChange={(e) => handleChange("content", e.target.value)}
        error={errors.content}
      />
      <Input
        label="Room"
        value={formData.room}
        onChange={(e) => handleChange("room", e.target.value)}
        error={errors.room}
      />
      <Button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </form>
  );
};
```

**Key Patterns:**
- ✅ **Zod schema first**: Define validation rules, infer types from schema
- ✅ **Type-safe updates**: Use `keyof` for field names
- ✅ **Proper error handling**: Catch `ZodError` and format to flat object
- ✅ **Clean component**: Focus on rendering, delegate logic to hook

## Component Organization Rules

1. **One component per file** (except for small, tightly coupled sub-components)
2. **File naming**: Match component name (e.g., `DrawerCard.tsx` for `DrawerCard`)
3. **Co-locate related components**: Group in feature folders
   ```
   components/
     drawers/
       DrawerCard.tsx
       DrawerList.tsx
       DrawerListLoading.tsx
       DrawerListError.tsx
       DrawerListEmpty.tsx
   ```
4. **Export structure**: Named exports for components, default exports only when a framework requires them

## Quick Checklist

Before finalizing a component, ask:

- [ ] Does this component have multiple conditional renders? → Extract state components
- [ ] Does this component map through data? → Create an Item component
- [ ] Does this component exceed 100 lines? → Look for extraction opportunities
- [ ] Does this component have 4+ useState calls? → Extract a custom hook
- [ ] Could this component be more flexible? → Consider composition patterns
- [ ] Is this component doing data fetching AND rendering? → Split container/presentational
