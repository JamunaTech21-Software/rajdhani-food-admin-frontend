import { Controller } from "react-hook-form";

import { RichTextEditor } from "../../../components/ui/RichTextEditor.jsx";

// Each maps to a tab on the public product page. §10.2: an empty one is hidden
// rather than rendered blank, which is why clearing a field must store null.
const SECTIONS = [
  { name: "description", label: "Description", hint: "The main body of the product page." },
  { name: "ingredients", label: "Ingredients" },
  { name: "nutrition_info", label: "Nutrition information" },
  { name: "brewing_guide", label: "Brewing guide" },
  { name: "packaging_info", label: "Packaging" },
];

export function ContentTab({ control }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink-muted">
        Each section becomes a tab on the public product page. Leave one empty and that tab is
        hidden rather than shown blank.
      </p>

      {SECTIONS.map(({ name, label, hint }) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field }) => (
            <RichTextEditor
              label={label}
              hint={hint}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      ))}
    </div>
  );
}
