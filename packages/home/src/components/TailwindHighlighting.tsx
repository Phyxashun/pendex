import React, { useState } from 'react';

/**
 * Tailwind CSS v4.3.3 Stress-Test Component for VS Code Syntax Highlighting
 * This file aggregates canonical v4 syntax, multi-variant chains,
arbitrary brackets,
 * and specific utilities added or renamed in v4.x.
 */
export const TailwindV4TestComponent: React.FC = () => {
    const [isActive, setIsActive] = useState<boolean>(false);

    return (
        <div className="min-h-screen bg-neutral-50 p-8
text-neutral-900 selection:bg-teal-500/30">

            {/* SECTION 1: Dynamic Structural Elements & New v4 Layout
Engine */}
            <header className="mb-12 border-b border-neutral-200 pb-6">
                {/* Canonical v4 renaming: bg-linear-to-r (instead of
v3 bg-gradient-to-r) */}
                <h1 className="bg-linear-to-r from-indigo-600
via-purple-600 to-pink-600 bg-clip-text text-4xl font-black
tracking-tight text-transparent">
                    Tailwind CSS v4.3.3 Syntax Highlight Test Matrix
                </h1>
                <p className="mt-2 text-sm text-neutral-500/80 font-mono">
                    Testing: Multi-variants, brackets, modern
primitives, and 2026 releases.
                </p>
            </header>

            <main className="grid grid-cols-1 gap-8 md:grid-cols-2
lg:grid-cols-3">

                {/* SECTION 2: Text Shadows & Overflow Wraps (Added in
v4.1+) */}
                <section className="rounded-2xl border
border-neutral-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-neutral-800
mb-4">1. Typography & v4.1 Text Shadows</h2>
                    <div className="space-y-4">
                        {/* New text-shadow utilities with color matching */}
                        <p className="text-3xl font-extrabold
text-indigo-700 text-shadow-md text-shadow-indigo-500/40">
                            Text Shadow MD
                        </p>
                        <p className="text-2xl font-bold text-pink-600
text-shadow-sm text-shadow-black/50">
                            Text Shadow SM Dark
                        </p>
                        {/* New wrap-break-word configuration for
defensive layout design */}
                        <p className="wrap-break-word rounded
bg-neutral-100 p-2 font-mono text-xs text-neutral-600">

Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz
                        </p>
                        {/* Last baseline alignment matching modern
engine specifications */}
                        <div className="flex items-baseline-last gap-2
bg-neutral-50 p-2">
                            <span className="text-sm
text-neutral-400">Label:</span>
                            <span className="text-xl
font-semibold">Value Baseline-Last</span>
                        </div>
                    </div>
                </section>

                {/* SECTION 3: 3D Transforms, Depth & Perspective
(Core v4 Engine additions) */}
                <section className="rounded-2xl border
border-neutral-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-neutral-800
mb-4">2. 3D Transforms & Perspective</h2>
                    {/* perspective-* and 3D transform classes */}
                    <div className="perspective-1000 flex h-32
items-center justify-center bg-neutral-900 rounded-xl">
                        <div className="h-16 w-32 rotate-x-30
rotate-y-30 translate-z-10 rounded-lg bg-linear-to-br from-amber-400
to-orange-600 p-4 font-bold text-white shadow-xl transform-3d
transition-transform hover:rotate-y-45">
                            3D Matrix
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2
text-center text-xs font-mono">
                        <span className="rounded bg-neutral-100
p-1">inset-shadow-sm</span>
                        <span className="rounded bg-neutral-100
p-1">inset-ring-1</span>
                    </div>
                    {/* Multiple depth layers test */}
                    <div className="mt-3 h-8 w-full rounded bg-white
shadow-md inset-shadow-xs inset-shadow-black/20 ring-1 ring-black/5
inset-ring-1 inset-ring-white/20"></div>
                </section>

                {/* SECTION 4: Native Scrollbars & Mask Utilities
(Added up to v4.3) */}
                <section className="rounded-2xl border
border-neutral-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-neutral-800
mb-4">3. v4.3 Scrollbars & Masks</h2>
                    {/* Testing scrollbar-thin and scrollbar-none styling */}
                    <div className="h-24 overflow-y-scroll
scrollbar-thin scrollbar-track-neutral-100 scrollbar-thumb-neutral-400
p-2 bg-neutral-50 rounded-lg text-xs space-y-1">
                        <p>Scrollbar utility baseline checks.</p>
                        <p>Native properties testing through tailwind
core engine.</p>
                        <p>No external custom plugins required.</p>
                        <p>Scrollbar handling finalized in v4.3.3 releases.</p>
                    </div>
                    {/* Testing v4 modern CSS mask properties using
simple linear gradients */}
                    <div className="mt-4 h-12 w-full bg-blue-600
mask-image-[linear-gradient(to_right,rgba(0,0,0,1),rgba(0,0,0,0))]">
                        <span className="p-2 text-xs font-bold
text-white block">Mask Fade Utility Test</span>
                    </div>
                </section>

                {/* SECTION 5: Native Container Queries & Logical Properties */}
                <section className="rounded-2xl border
border-neutral-200 bg-white p-6 shadow-sm md:col-span-2
lg:col-span-1">
                    <h2 className="text-lg font-bold text-neutral-800
mb-4">4. Container Queries & Logical Specs</h2>
                    {/* Initializing container scope using @container */}
                    <div className="@container/card rounded-xl
bg-purple-50 p-4">
                        <p className="text-xs text-purple-400
font-mono">@container/card definition context</p>
                        {/* Conditional element targeting based on
container width size presets */}
                        <div className="grid grid-cols-1 gap-2
@md/card:grid-cols-2 @lg/card:grid-cols-3">
                            <div className="rounded bg-white p-2
text-center text-xs font-semibold shadow-xs">
                                Adaptive Block A
                            </div>
                            <div className="rounded bg-white p-2
text-center text-xs font-semibold shadow-xs @md/card:inline-block
hidden">
                                Adaptive Block B (@md)
                            </div>
                        </div>
                    </div>
                    {/* Testing Modern Internationalization Logical
Inline Properties */}
                    <div className="mt-4 flex gap-2">
                        <div className="pis-4 pie-2 pbs-1 pbe-3
bg-neutral-100 text-xs font-mono rounded">
                            Logical Padding (pis, pie, pbs, pbe)
                        </div>
                    </div>
                </section>

                {/* SECTION 6: High Intensity Arbitrary Bracket
Signatures & Modifier States */}
                <section className="rounded-2xl border
border-neutral-200 bg-white p-6 shadow-sm md:col-span-2">
                    <h2 className="text-lg font-bold text-neutral-800
mb-4">5. Complex Multi-Variant Chains & Arbitrary Brackets</h2>

                    <div className="space-y-4">
                        {/* Deep nested multi-state variants combined
with OKLCH variables and alpha transparency modifiers */}
                        <button
                            onClick={() => setIsActive(!isActive)}
                            className={`
                                w-full px-5 py-3 rounded-xl
font-medium tracking-wide transition-all duration-300
                                focus-visible:outline-2
focus-visible:outline-offset-4 focus-visible:outline-teal-500
disabled:opacity-50 disabled:pointer-events-none
                                ${isActive
                                    ? 'bg-emerald-600
hover:bg-emerald-700 text-white
shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                    : 'bg-neutral-900
hover:bg-neutral-800 text-white dark:hover:bg-neutral-700'
                                }
                            `}
                        >
                            Interactive Component State Switcher
                        </button>

                        {/* Stress testing pure regex extraction
engines using specialized bracket symbols */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div className="p-3 text-xs bg-white
border border-neutral-200 rounded-lg hover:bg-[oklch(0.92_0.04_240)]
transition-colors">
                                <span className="font-bold block
mb-1">Arbitrary OKLCH Background Color:</span>
                                <code>bg-[oklch(0.92_0.04_240)]</code>
                            </div>

                            <div className="p-3 text-xs bg-white
border border-neutral-200 rounded-lg text-[calc(1.5rem-8px)]
leading-12">
                                <span className="font-bold block
text-sm mb-1">Calc Function Dimensions:</span>
                                <code>text-[calc(1.5rem-8px)]</code>
                            </div>

                            <div className="p-3 text-xs bg-white
border border-neutral-200 rounded-lg grid grid-cols-[200px_1fr]
gap-2">
                                <div className="bg-neutral-100 p-1
font-mono">Explicit Grid Width</div>
                                <div className="bg-neutral-200 p-1
font-mono">grid-cols-[200px_1fr]</div>
                            </div>

                            {/* Testing pseudo element injection
pipelines inside Tailwind arbitrary layers */}
                            <div className="p-3 text-xs bg-white
border border-neutral-200 rounded-lg after:content-['*'] after:ml-0.5
after:text-red-500">
                                <span className="font-bold">Required
Pseudo Class Label Marker</span>
                            </div>
                        </div>

                        {/* Test child combinators, deep group
behaviors, and complex CSS selector injections */}
                        <div className="group rounded-xl
bg-neutral-900 p-4 text-white hover:bg-neutral-950 transition-colors">
                            <p className="text-xs font-semibold
text-neutral-400 group-hover:text-amber-400 transition-colors">
                                Parent Hover Context (.group)
                            </p>
                            <div className="mt-2 flex gap-2">
                                {/* in-* variant simplifies standard
tree selector chaining patterns natively */}
                                <span className="rounded
bg-neutral-800 px-2 py-1 text-xs in-hover:bg-amber-500/20
in-hover:text-amber-300">
                                    Descendant Target A
                                </span>
                                {/* Double asterisk targeting
constructs full descendant tree controls */}
                                <span className="rounded
bg-neutral-800 px-2 py-1 text-xs **:text-teal-400 font-serif">
                                    <i>Tree Target B</i>
                                </span>
                            </div>
                            {/* Starting-style primitive variant
configurations (Added for runtime native element transition entries)
*/}
                            <div className="starting:opacity-0
starting:scale-95 duration-500 ease-out p-4 bg-teal-50 border
border-teal-200 rounded-xl text-teal-900 text-xs">
                                <span className="font-bold block
mb-1">Native CSS @starting-style Entry Transition:</span>
                                Utilizes <code>starting:opacity-0
starting:scale-95</code> layout primitives directly inside standard
compiler routines.
                            </div>

                        </div>
                    </div>
                </section>
            </main>

            <footer className="mt-12 text-center text-xs
text-neutral-400 font-mono">
                Tailwind CSS v4.3.3 High-Density Structural Parsing
Diagnostics Target.
            </footer>
        </div>
    );
};

export default TailwindV4TestComponent;
