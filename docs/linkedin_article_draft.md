# From a Neighborhood Walk to a Land History Map in Under 24 Hours

My wife and I were walking through our neighborhood in Park Ridge, Illinois, talking out loud about what the area must have looked like over the last 120 years.

Which blocks came first?

Where were lots split or combined?

What did this place look like before the postwar build-out?

Could you actually see that history parcel by parcel?

That conversation turned into a small experiment: build an interactive land-history map for Park Ridge and see how far it could get in less than 24 hours.

The first idea was straightforward: use assessor year-built data to color parcels by decade. That worked quickly and immediately made the city feel more legible. You could see older clusters, newer build-out, and the rhythm of development across the map.

But the first important lesson was also the most important caveat:

Year built is not subdivision date.

A building's construction year does not prove when a lot was created. A replacement structure can make an old parcel look new. A parcel can be split, merged, replatted, or corrected without that history being visible in assessor year-built data.

So the project became something more useful than a year-built map. It became a layered historical evidence tool.

The current prototype now includes:

- Current Park Ridge parcel mapping using Cook County parcel and assessor data.
- Parcel coloring by decade built.
- Search and parcel detail panels.
- A cumulative build-out animation.
- A real Park Ridge municipal boundary from Census TIGER/Line data.
- Real Cook County historical parcel layers for 2000 and 2021.
- A computed 2000-to-2021 parcel change layer.
- A summary panel showing likely splits, likely merges, new PINs, retired PINs, unchanged parcels, and area/geometry changes.
- A historical layer registry that tracks source, attribution, readiness, and caveats for each layer.

The 2000-to-2021 comparison now produces real candidate counts:

- 12,789 unchanged parcels
- 76 likely splits
- 54 likely merges
- 520 new PINs
- 227 retired PINs
- 145 geometry or area changes

These are candidates, not final historical conclusions. They still need to be checked against recorded plats, tax records, survey evidence, aerial imagery, and local historical sources. But the map now makes the right questions much easier to ask.

That is the part I find exciting. This started as a walk and a conversation. Within a day, it became a deployed prototype that can compare real parcel snapshots and begin surfacing how the land itself changed over time.

The larger idea is not that one dataset can explain a place. It cannot.

Land history is a stack of evidence:

- parcel boundaries
- assessor records
- municipal boundaries
- subdivision plats
- aerial imagery
- Sanborn maps
- local landmark records
- survey grids
- field knowledge from people who live there

The goal is to make that evidence visible, organized, and honest about its limits.

This is still early. The next steps are to bring in more historical years, add aerial imagery, connect parcel-change candidates to recorded subdivision evidence, and make the interface better at explaining uncertainty.

But it already changed how I see the neighborhood.

A casual question on a walk became a working map. And the map is starting to show that every block has a longer story under it.
