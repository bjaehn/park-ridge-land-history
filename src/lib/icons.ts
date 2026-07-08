/**
 * Central icon registry. Every historical/UI concept maps to exactly one icon here.
 * Import from this file, never directly from lucide-react, so the mapping stays consistent.
 *
 * Rule: the same concept always uses the same icon, everywhere in the app.
 */

export {
  // Property and place hierarchy
  Home          as PropertyIcon,
  MapPin        as StreetIcon,
  Landmark      as NeighborhoodIcon,
  FileText      as SubdivisionIcon,
  Map           as MapIcon,
  Building2     as CityIcon,
  LandPlot      as PlanningDistrictIcon,
  Store         as BusinessDistrictIcon,

  // Timeline and dates
  Clock         as TimelineIcon,
  Calendar      as YearBuiltIcon,
  GitCommit     as EventDotIcon,

  // Historical event types
  Hammer        as PermitIcon,
  DollarSign    as SaleIcon,
  BarChart3     as AssessmentIcon,
  TrendingUp    as GrowthIcon,
  ArrowLeftRight as ComparisonIcon,

  // Data quality and sourcing
  CheckCircle2  as VerifiedIcon,
  CircleAlert   as UncertainIcon,
  TriangleAlert as WarningIcon,
  CircleHelp    as MissingIcon,
  BookOpen      as SourceIcon,
  Shield        as ConfidenceIcon,

  // Physical attributes
  Ruler         as SizeIcon,
  Layers        as PlatLayersIcon,
  LayoutGrid    as LotIcon,

  // UI actions / affordances
  ChevronRight  as ChevronRightIcon,
  ChevronDown   as ChevronDownIcon,
  Maximize2     as ExpandIcon,
  Minimize2     as CollapseIcon,
  ExternalLink  as ExternalLinkIcon,
  Search        as SearchIcon,
  Share2        as ShareIcon,
  Copy          as CopyIcon,

  // Community / story
  Camera        as PhotoIcon,
  MessageSquare as StoryIcon,
  PenLine       as CorrectIcon,
  Star          as HighlightIcon,

  // Designations and proposals
  Award         as LandmarkDesignationIcon,
  ClipboardList as ProposalIcon,
} from "lucide-react";
