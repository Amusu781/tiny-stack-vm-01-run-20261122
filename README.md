# tiny-stack-vm

[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

A tiny stack virtual machine for the make.fun bounty
[Build a tiny stack virtual machine, 22 November 2026](https://make.fun/bounty/tiny-stack-vm-01-run-20261122).

`main.ts` runs each `program.bin` on its `input.bin` exactly as the ISA
specifies: 32-bit wrapping arithmetic, a 256-value stack, a 64-deep call
stack, 256 words of memory, and all ten traps with their own exit codes —
including the hard rules: exact `Math.imul` multiplication, unsigned
`DIVU`/`MODU`/`LTU`, `INT_MIN / -1`, remainder signs, shift counts masked
to 5 bits, `PUSH8` sign extension, and the step and output limits. Node 22,
no dependencies. Deterministic: two runs write identical bytes.

## Run it

```sh
MAKEFUN_INPUT_DIR=<input-dir> MAKEFUN_OUTPUT_DIR=out node main.ts
```

Reads every instance from `<input-dir>/<id>/` and writes
`out/<id>/stdout.bin` and `out/<id>/exit.txt`, creating each output
directory first.

## Licence

MIT — see [LICENSE](LICENSE).
