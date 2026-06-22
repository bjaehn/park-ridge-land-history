"use server";

import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a GIS assistant helping map neighborhood boundaries for Park Ridge, Illinois.

Park Ridge is a suburb immediately northwest of Chicago. Its approximate bounding box is:
- Latitude: 41.97 to 42.03 (south to north)
- Longitude: -87.85 to -87.77 (west to east)

Key streets for reference (approximate coordinates):
- Touhy Ave: runs east-west near lat 42.012
- Higgins Rd / Northwest Hwy: diagonal from SW to NE
- Dee Road: runs north-south near lon -87.847
- Cumberland Ave: runs north-south near lon -87.832
- Prospect Ave: runs north-south near lon -87.840
- Oakton St: runs east-west near lat 41.993
- Devon Ave: runs east-west near lat 41.997
- Dempster St: runs east-west near lat 42.043 (just north of Park Ridge)

Given a neighborhood name and a plain-language boundary description, return ONLY a valid GeoJSON Geometry object (Polygon or MultiPolygon). No prose, no markdown, no explanation — just the raw JSON.

The polygon must:
- Close (last coordinate = first coordinate)
- Use [longitude, latitude] coordinate order
- Be approximate but reasonable for the described area
- Stay within Park Ridge bounds`;

export async function generateNeighborhoodBoundary(
  label: string,
  description: string
): Promise<{ geojson?: string; error?: string }> {
  if (!description.trim()) return { error: "Please describe the neighborhood boundary first." };

  const client = new Anthropic();

  const userPrompt = `Neighborhood: ${label}

Boundary description: ${description}

Return only the GeoJSON Geometry object.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    const parsed = JSON.parse(jsonText);
    if (!parsed.type || !parsed.coordinates) {
      return { error: "AI returned an unexpected response. Try rephrasing the boundary description." };
    }

    return { geojson: JSON.stringify(parsed, null, 2) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `AI generation failed: ${msg}` };
  }
}
