import {
  Award,
  Calendar,
  Boxes,
  CircleCheck,
  CircleHelp,
  Coffee,
  Droplet,
  Factory,
  FileText,
  FlaskConical,
  Flame,
  Globe,
  Handshake,
  Image,
  Leaf,
  Mail,
  Mountain,
  Map,
  Package,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Tags,
  Truck,
  Users,
  Wheat,
} from "lucide-react";

/**
 * Icons named by the content model.
 *
 * `categories.icon_name`, `feature_items.icon_name` and `process_steps.icon_name`
 * hold Lucide names chosen by an editor, so the set is data rather than code.
 * This registry is explicit instead of a wildcard import: `import * as lucide`
 * would pull all 6,299 icons into the bundle and defeat tree-shaking.
 *
 * Add an entry when the content team starts using a new name.
 */
export const REGISTRY = {
  award: Award,
  calendar: Calendar,
  boxes: Boxes,
  "check-circle": CircleCheck,
  coffee: Coffee,
  droplet: Droplet,
  factory: Factory,
  "file-text": FileText,
  flame: Flame,
  "flask-conical": FlaskConical,
  globe: Globe,
  handshake: Handshake,
  image: Image,
  leaf: Leaf,
  mail: Mail,
  mountain: Mountain,
  map: Map,
  package: Package,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  sprout: Sprout,
  star: Star,
  tags: Tags,
  truck: Truck,
  users: Users,
  wheat: Wheat,
};

/** An editor can leave icon_name null or type a name nothing renders. */
export const FALLBACK = CircleHelp;

export const isKnownIcon = (name) => Boolean(name && REGISTRY[name]);
export const iconNames = Object.keys(REGISTRY);
