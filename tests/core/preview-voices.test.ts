import { describe, expect, test } from "bun:test";
import {
  parseVoiceList,
  filterByLocale,
  buildSynthArgs,
  parseArgs,
} from "../../scripts/preview-voices";

const SAMPLE = `Name                               Gender    ContentCategories      VoicePersonalities
en-GB-LibbyNeural                  Female    General                Friendly, Positive
en-GB-MaisieNeural                 Female    General                Friendly, Positive
en-GB-RyanNeural                   Male      News                   Authority
en-GB-SoniaNeural                  Female    News                   Friendly
en-GB-ThomasNeural                 Male      News                   Calm
en-US-AvaNeural                    Female    General                Caring
en-AU-NatashaNeural                Female    General                Friendly`;

describe("parseVoiceList", () => {
  test("parses rows and skips the header line", () => {
    const voices = parseVoiceList(SAMPLE);
    expect(voices).toHaveLength(7);
    expect(voices[0]).toEqual({ name: "en-GB-LibbyNeural", gender: "Female" });
    expect(voices.every((v) => !v.name.startsWith("Name"))).toBe(true);
  });
});

describe("filterByLocale", () => {
  test("returns exactly the en-GB voices and nothing else", () => {
    const gb = filterByLocale(parseVoiceList(SAMPLE), ["en-GB"]).map((v) => v.name);
    expect(gb).toEqual([
      "en-GB-LibbyNeural",
      "en-GB-MaisieNeural",
      "en-GB-RyanNeural",
      "en-GB-SoniaNeural",
      "en-GB-ThomasNeural",
    ]);
  });

  test("unknown locale matches nothing", () => {
    expect(filterByLocale(parseVoiceList(SAMPLE), ["xx-XX"])).toEqual([]);
  });

  test("does not prefix-match across locales (en-G must not catch en-GB via substring)", () => {
    // en-US- should never appear when filtering en-GB
    const gb = filterByLocale(parseVoiceList(SAMPLE), ["en-GB"]);
    expect(gb.some((v) => v.name.startsWith("en-US"))).toBe(false);
  });
});

describe("buildSynthArgs", () => {
  test("substitutes {voice} and includes voice, rate, and output file", () => {
    const args = buildSynthArgs("en-GB-RyanNeural", "Hi, I'm {voice}.", "-6%", "/tmp/x.mp3");
    expect(args).toContain("en-GB-RyanNeural");
    expect(args).toContain("-6%");
    expect(args).toContain("/tmp/x.mp3");
    expect(args[args.indexOf("--text") + 1]).toBe("Hi, I'm en-GB-RyanNeural.");
    expect(args[args.indexOf("--voice") + 1]).toBe("en-GB-RyanNeural");
  });
});

describe("parseArgs", () => {
  test("defaults to the four English locales, no explicit voices, no audio flags", () => {
    const o = parseArgs([]);
    expect(o.locales).toEqual(["en-US", "en-GB", "en-AU", "en-IE"]);
    expect(o.voices).toBeNull();
    expect(o.list).toBe(false);
    expect(o.dryRun).toBe(false);
    expect(o.rate).toBe("+0%");
  });

  test("--dry-run sets dryRun and parses an explicit voice set", () => {
    const o = parseArgs(["--dry-run", "--voices", "en-GB-RyanNeural,en-GB-ThomasNeural"]);
    expect(o.dryRun).toBe(true);
    expect(o.voices).toEqual(["en-GB-RyanNeural", "en-GB-ThomasNeural"]);
  });

  test("--locale and --rate are parsed", () => {
    const o = parseArgs(["--locale", "en-GB,en-IE", "--rate", "-6%"]);
    expect(o.locales).toEqual(["en-GB", "en-IE"]);
    expect(o.rate).toBe("-6%");
  });
});
