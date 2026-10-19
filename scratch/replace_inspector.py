import os

file_path = r'c:\dev\vibecheck\app\studio\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '{/* Scrollable Sections Container */}'
end_marker = '{/* Footer: Deselect action */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"Error: markers not found! start: {start_idx}, end: {end_idx}")
    exit(1)

replacement = """{/* Top Tabs: Design | Settings (with emerald SaaS active line) */}
                <div className="flex border-b border-[#E5E7EB] px-3 shrink-0 bg-white sticky top-0 z-10">
                  <button
                    type="button"
                    onClick={() => setActiveTab('design')}
                    className={`py-2 px-3 text-xs font-semibold relative transition cursor-pointer ${
                      activeTab === 'design' ? 'text-[#059669]' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Design
                    {activeTab === 'design' && (
                      <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#059669] rounded-full"></span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className={`py-2 px-3 text-xs font-medium relative transition cursor-pointer ${
                      activeTab === 'settings' ? 'text-[#059669]' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Settings
                    {activeTab === 'settings' && (
                      <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#059669] rounded-full"></span>
                    )}
                  </button>
                </div>

                {/* Inspector Content */}
                <div className="flex-1 overflow-y-auto">
                  {activeTab === 'design' ? (
                    <div className="p-3.5 space-y-4 text-xs text-slate-700">

                      {/* ---------------------------------------------------- */}
                      {/* Section: Layout                                      */}
                      {/* ---------------------------------------------------- */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleSection('layout')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            <span className="text-slate-400 text-xs font-mono">
                              {openSections.layout ? '−' : '›'}
                            </span>
                            <span>Layout</span>
                          </span>
                        </button>

                        {openSections.layout && (
                          <div className="space-y-2 pt-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Display</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.display}
                                  onChange={(e) =>
                                    updateElementProp('display', e.target.value, {
                                      kind: 'style',
                                      prop: 'display',
                                      val: e.target.value.toLowerCase(),
                                    })
                                  }
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-emerald-500/20"
                                >
                                  <option>Block</option>
                                  <option>Flex</option>
                                  <option>Grid</option>
                                  <option>Inline-Block</option>
                                  <option>None</option>
                                </select>
                                <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <hr className="border-[#F1F5F9]" />

                      {/* ---------------------------------------------------- */}
                      {/* Section: Size                                        */}
                      {/* ---------------------------------------------------- */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleSection('size')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            <span className="text-slate-400 text-xs font-mono">
                              {openSections.size ? '−' : '›'}
                            </span>
                            <span>Size</span>
                          </span>
                        </button>

                        {openSections.size && (
                          <div className="space-y-2.5 pt-0.5 text-xs">
                            {/* Width */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Width</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.width}
                                  onChange={(e) => updateElementProp('width', e.target.value)}
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-emerald-500/20"
                                >
                                  <option>Auto</option>
                                  <option>Full</option>
                                  <option>1/2</option>
                                  <option>Fit</option>
                                  <option>Custom</option>
                                </select>
                                <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>

                            {/* Height */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Height</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.height}
                                  onChange={(e) => updateElementProp('height', e.target.value)}
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-emerald-500/20"
                                >
                                  <option>Auto</option>
                                  <option>Fit</option>
                                  <option>Full</option>
                                  <option>Custom</option>
                                </select>
                                <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>

                            {/* Overflow Segmented Control */}
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-slate-500 text-[11px]">Overflow</span>
                              <div className="flex items-center border border-[#E2E8F0] rounded-md overflow-hidden p-0.5 bg-[#F8FAFC]">
                                <button
                                  type="button"
                                  onClick={() => updateElementProp('overflow', 'visible')}
                                  className={`p-1 rounded text-xs transition cursor-pointer ${
                                    activeElement.overflow === 'visible' ? 'bg-white shadow-xs text-[#059669] font-medium' : 'text-slate-400 hover:text-slate-700'
                                  }`}
                                  title="Visible"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateElementProp('overflow', 'hidden')}
                                  className={`p-1 rounded text-xs transition cursor-pointer ${
                                    activeElement.overflow === 'hidden' ? 'bg-white shadow-xs text-[#059669] font-medium' : 'text-slate-400 hover:text-slate-700'
                                  }`}
                                  title="Hidden"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateElementProp('overflow', 'scroll')}
                                  className={`p-1 rounded text-xs transition cursor-pointer ${
                                    activeElement.overflow === 'scroll' ? 'bg-white shadow-xs text-[#059669] font-medium' : 'text-slate-400 hover:text-slate-700'
                                  }`}
                                  title="Scroll"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="2" x2="12" y2="22" />
                                    <polyline points="8 6 12 2 16 6" />
                                    <polyline points="8 18 12 22 16 18" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateElementProp('overflow', 'auto')}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                                    activeElement.overflow === 'auto' ? 'bg-white shadow-xs text-[#059669] font-bold' : 'text-slate-400 hover:text-slate-700'
                                  }`}
                                  title="Auto"
                                >
                                  Auto
                                </button>
                              </div>
                            </div>

                            {/* Object */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Object</span>
                              <div className="flex items-center space-x-1">
                                <div className="relative w-28">
                                  <select
                                    className="w-full bg-white border border-[#E2E8F0] rounded-md px-2 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                  >
                                    <option>Fill</option>
                                    <option>Fit</option>
                                    <option>Contain</option>
                                    <option>Cover</option>
                                    <option>None</option>
                                  </select>
                                  <ChevronDown size={11} className="text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                                </div>
                                <button
                                  type="button"
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                  title="More options"
                                >
                                  <MoreHorizontal size={13} />
                                </button>
                              </div>
                            </div>

                            {/* More options button */}
                            <div className="pt-1 flex justify-center">
                              <button
                                type="button"
                                onClick={() => showToast('All dimensions visible')}
                                className="w-full py-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white text-[11px] text-slate-600 font-medium transition text-center shadow-2xs cursor-pointer"
                              >
                                More options
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <hr className="border-[#F1F5F9]" />

                      {/* ---------------------------------------------------- */}
                      {/* Section: Spacing (The Box Model Diagram)             */}
                      {/* ---------------------------------------------------- */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleSection('spacing')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            <span className="text-slate-400 text-xs font-mono">
                              {openSections.spacing ? '−' : '›'}
                            </span>
                            <span>Spacing</span>
                          </span>
                        </button>

                        {openSections.spacing && (
                          <div className="pt-1">
                            {/* Outer Box Model Canvas */}
                            <div className="relative bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col items-center">
                              
                              {/* Margin Top */}
                              <input
                                type="text"
                                value={activeElement.marginTop}
                                onChange={(e) => updateElementProp('marginTop', e.target.value)}
                                className="w-10 text-center bg-transparent border-0 p-0 text-slate-500 text-[11px] font-mono focus:ring-0 mb-1 hover:bg-slate-200/50 rounded cursor-text"
                              />

                              <div className="w-full flex items-center justify-between">
                                {/* Margin Left */}
                                <input
                                  type="text"
                                  value={activeElement.marginLeft}
                                  onChange={(e) => updateElementProp('marginLeft', e.target.value)}
                                  className="w-10 text-center bg-transparent border-0 p-0 text-slate-500 text-[11px] font-mono focus:ring-0 hover:bg-slate-200/50 rounded cursor-text"
                                />

                                {/* Inner Padding Dashed Box */}
                                <div className="w-36 bg-white border border-dashed border-[#CBD5E1] rounded-lg p-2.5 relative flex flex-col items-center shadow-2xs">
                                  {/* Padding Top */}
                                  <input
                                    type="text"
                                    value={activeElement.paddingTop}
                                    onChange={(e) =>
                                      updateElementProp('paddingTop', e.target.value, {
                                        kind: 'style',
                                        prop: 'padding',
                                        val: `p-${Math.round(Number(e.target.value) / 4) || 0}`,
                                      })
                                    }
                                    className="w-8 text-center bg-transparent border-0 p-0 text-slate-600 text-[11px] font-mono font-medium focus:ring-0 mb-1 hover:bg-slate-100 rounded cursor-text"
                                  />

                                  <div className="w-full flex items-center justify-between px-1">
                                    {/* Padding Left */}
                                    <input
                                      type="text"
                                      value={activeElement.paddingLeft}
                                      onChange={(e) =>
                                        updateElementProp('paddingLeft', e.target.value, {
                                          kind: 'style',
                                          prop: 'padding',
                                          val: `p-${Math.round(Number(e.target.value) / 4) || 0}`,
                                        })
                                      }
                                      className="w-6 text-center bg-transparent border-0 p-0 text-slate-600 text-[11px] font-mono font-medium focus:ring-0 hover:bg-slate-100 rounded cursor-text"
                                    />

                                    {/* Core Element Square */}
                                    <div className="h-5 w-6 bg-[#E2E8F0] rounded flex items-center justify-center"></div>

                                    {/* Padding Right */}
                                    <input
                                      type="text"
                                      value={activeElement.paddingRight}
                                      onChange={(e) =>
                                        updateElementProp('paddingRight', e.target.value, {
                                          kind: 'style',
                                          prop: 'padding',
                                          val: `p-${Math.round(Number(e.target.value) / 4) || 0}`,
                                        })
                                      }
                                      className="w-6 text-center bg-transparent border-0 p-0 text-slate-600 text-[11px] font-mono font-medium focus:ring-0 hover:bg-slate-100 rounded cursor-text"
                                    />
                                  </div>

                                  {/* Padding Bottom */}
                                  <input
                                    type="text"
                                    value={activeElement.paddingBottom}
                                    onChange={(e) =>
                                      updateElementProp('paddingBottom', e.target.value, {
                                        kind: 'style',
                                        prop: 'padding',
                                        val: `p-${Math.round(Number(e.target.value) / 4) || 0}`,
                                      })
                                    }
                                    className="w-8 text-center bg-transparent border-0 p-0 text-slate-600 text-[11px] font-mono font-medium focus:ring-0 mt-1 hover:bg-slate-100 rounded cursor-text"
                                  />
                                </div>

                                {/* Margin Right */}
                                <input
                                  type="text"
                                  value={activeElement.marginRight}
                                  onChange={(e) => updateElementProp('marginRight', e.target.value)}
                                  className="w-10 text-center bg-transparent border-0 p-0 text-slate-500 text-[11px] font-mono focus:ring-0 hover:bg-slate-200/50 rounded cursor-text"
                                />
                              </div>

                              {/* Margin Bottom */}
                              <input
                                type="text"
                                value={activeElement.marginBottom}
                                onChange={(e) => updateElementProp('marginBottom', e.target.value)}
                                className="w-10 text-center bg-transparent border-0 p-0 text-slate-500 text-[11px] font-mono focus:ring-0 mt-1 hover:bg-slate-200/50 rounded cursor-text"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <hr className="border-[#F1F5F9]" />

                      {/* ---------------------------------------------------- */}
                      {/* Section: Text                                        */}
                      {/* ---------------------------------------------------- */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleSection('text')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            <span className="text-slate-400 text-xs font-mono">
                              {openSections.text ? '−' : '›'}
                            </span>
                            <span>Text</span>
                          </span>
                        </button>

                        {openSections.text && (
                          <div className="space-y-2.5 pt-0.5 text-xs">
                            {/* Typeface */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Typeface</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.typeface}
                                  onChange={(e) =>
                                    updateElementProp('typeface', e.target.value, {
                                      kind: 'style',
                                      prop: 'fontFamily',
                                      val: e.target.value === 'Manrope' ? 'font-sans' : 'font-mono',
                                    })
                                  }
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                >
                                  <option>Manrope</option>
                                  <option>Inter</option>
                                  <option>System UI</option>
                                </select>
                                <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>

                            {/* Weight */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Weight</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.fontWeight}
                                  onChange={(e) => {
                                    const weightMap: Record<string, string> = {
                                      'Regular': 'font-normal',
                                      'Medium': 'font-medium',
                                      'Semi Bold': 'font-semibold',
                                      'Bold': 'font-bold',
                                      'Extra Bold': 'font-extrabold',
                                    };
                                    updateElementProp('fontWeight', e.target.value, {
                                      kind: 'style',
                                      prop: 'fontWeight',
                                      val: weightMap[e.target.value] || 'font-semibold',
                                    });
                                  }}
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                >
                                  <option>Regular</option>
                                  <option>Medium</option>
                                  <option>Semi Bold</option>
                                  <option>Bold</option>
                                  <option>Extra Bold</option>
                                </select>
                                <ChevronDown size={12} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>

                            {/* Color */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Color</span>
                              <div className="flex items-center space-x-1.5 w-36 bg-white border border-[#E2E8F0] rounded-md px-2 py-1 focus-within:border-[#059669]">
                                <div
                                  className="h-4 w-4 rounded-sm shadow-2xs border border-black/10 shrink-0"
                                  style={{ backgroundColor: `#${activeElement.textColor}` }}
                                ></div>
                                <input
                                  type="text"
                                  value={activeElement.textColor}
                                  onChange={(e) =>
                                    updateElementProp('textColor', e.target.value.replace('#', ''), {
                                      kind: 'style',
                                      prop: 'textColor',
                                      val: `text-[#${e.target.value.replace('#', '')}]`,
                                    })
                                  }
                                  className="w-full bg-transparent p-0 border-none text-[11px] font-mono text-slate-800 focus:ring-0"
                                />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Content</span>
                              <input
                                type="text"
                                value={activeElement.text || ''}
                                onChange={(e) =>
                                  updateElementProp('text', e.target.value, {
                                    kind: 'text',
                                  })
                                }
                                placeholder="Edit text content..."
                                className="w-36 bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#059669]"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <hr className="border-[#F1F5F9]" />

                      {/* ---------------------------------------------------- */}
                      {/* Section: Background (Collapsible)                    */}
                      {/* ---------------------------------------------------- */}
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleSection('background')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            <span className="text-slate-400 text-xs font-mono">
                              {openSections.background ? '−' : '›'}
                            </span>
                            <span>Background</span>
                          </span>
                        </button>
                        {openSections.background && (
                          <div className="pt-2 text-xs text-slate-500 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px]">Fill</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.bgFill}
                                  onChange={(e) =>
                                    updateElementProp('bgFill', e.target.value, {
                                      kind: 'style',
                                      prop: 'backgroundColor',
                                      val: `bg-${e.target.value}`,
                                    })
                                  }
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                >
                                  <option value="transparent">Transparent</option>
                                  <option value="white">White</option>
                                  <option value="slate-50">Slate 50</option>
                                  <option value="slate-900">Slate 900</option>
                                  <option value="emerald-50">Emerald 50</option>
                                </select>
                                <ChevronDown size={11} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <hr className="border-[#F1F5F9]" />

                      {/* ---------------------------------------------------- */}
                      {/* Section: Borders (Collapsible)                       */}
                      {/* ---------------------------------------------------- */}
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleSection('borders')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            <span className="text-slate-400 text-xs font-mono">
                              {openSections.borders ? '−' : '›'}
                            </span>
                            <span>Borders</span>
                          </span>
                        </button>
                        {openSections.borders && (
                          <div className="pt-2 text-xs text-slate-500 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px]">Radius</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.borderRadius}
                                  onChange={(e) =>
                                    updateElementProp('borderRadius', e.target.value, {
                                      kind: 'style',
                                      prop: 'borderRadius',
                                      val: e.target.value,
                                    })
                                  }
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                >
                                  <option value="rounded-none">Square (0)</option>
                                  <option value="rounded-sm">Small (2px)</option>
                                  <option value="rounded-md">Medium (6px)</option>
                                  <option value="rounded-lg">Large (8px)</option>
                                  <option value="rounded-xl">Extra Large (12px)</option>
                                  <option value="rounded-full">Pill (Full)</option>
                                </select>
                                <ChevronDown size={11} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <hr className="border-[#F1F5F9]" />

                      {/* ---------------------------------------------------- */}
                      {/* Section: Position (Collapsible)                      */}
                      {/* ---------------------------------------------------- */}
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleSection('position')}
                          className="w-full flex items-center justify-between text-left font-semibold text-xs text-slate-800 cursor-pointer select-none"
                        >
                          <span className="flex items-center space-x-1.5">
                            <span className="text-slate-400 text-xs font-mono">
                              {openSections.position ? '−' : '›'}
                            </span>
                            <span>Position</span>
                          </span>
                        </button>
                        {openSections.position && (
                          <div className="pt-2 text-xs text-slate-500 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px]">Mode</span>
                              <div className="relative w-36">
                                <select
                                  value={activeElement.position}
                                  onChange={(e) => updateElementProp('position', e.target.value)}
                                  className="w-full bg-white border border-[#E2E8F0] rounded-md px-2.5 py-1.5 text-xs text-slate-800 appearance-none focus:outline-none focus:border-[#059669]"
                                >
                                  <option>Relative</option>
                                  <option>Absolute</option>
                                  <option>Fixed</option>
                                  <option>Static</option>
                                </select>
                                <ChevronDown size={11} className="text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    /* SETTINGS TAB */
                    <div className="p-3.5 space-y-3.5 text-xs text-slate-700">
                      <div className="space-y-1">
                        <div className="text-[11.5px] font-semibold text-slate-900">Element & Workspace Metadata</div>
                        <div className="text-[10.5px] text-slate-500">Connected AST nudger and local source adapter.</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 font-mono text-[10.5px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Tag / Name:</span>
                          <span className="text-slate-900 font-semibold">{activeElement.tag}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Element ID:</span>
                          <span className="text-slate-700 font-mono">{activeElement.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Source File:</span>
                          <span className="text-slate-900 truncate max-w-[130px]">{activeElement.filePath}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">Target Line:</span>
                          <span className="text-emerald-700 font-bold">{activeElement.line}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-sans">AST Status:</span>
                          <span className="text-emerald-600 font-semibold">Verified AST Node</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1 text-[11px]">
                        <div className="font-semibold text-slate-800">Element Tailwind Classes</div>
                        <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-[10px] text-slate-600 break-all leading-relaxed">
                          {activeElement.classes}
                        </div>
                      </div>

                      <div className="pt-2">
                        <Link
                          href="/workspace"
                          className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition shadow-2xs"
                        >
                          <span>Switch Repository / Project</span>
                          <ArrowUpRight size={12} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                """

new_content = content[:start_idx] + replacement + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replacement complete successfully!")
