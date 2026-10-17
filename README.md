<div align="right">

**[English](README.md)** · [简体中文](README.zh-CN.md)

</div>

# computelevelTWOC

Computer level exam quiz — a question bank and a practice page packed into a single HTML file.

<sub>HTML · one file · fully offline</sub>

---

## What it is

A single `index.html` (about 9.3 MB) that contains both the question bank and the practice interface. Open it and start answering.

The engineering here is a deliberate trade: everything — thousands of questions, the styling, the logic — lives in one file. The cost is poor architecture. The payoff is that a user needs nothing: no server, no install, no internet after the file is downloaded.

## Content

Seven-thousand-plus questions across the computer level exam subjects, with a browser-based practice flow.

The bank is also shipped as plain `.txt`/structured data under `download/` for reuse outside the page.

## Related tooling

The `tools/` directory holds companion scripts developed around the bank — see there for what they do.

## Running

```bash
# open in a browser
start index.html
```

Nothing to install. The page runs from disk.

## License

MIT