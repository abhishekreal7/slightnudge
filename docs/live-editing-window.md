# Local editing window

Open Studio and choose **Open editing window**. For an imported Next.js project, start its local development server with the SlightNudge source adapter, connect its localhost address in Studio, and choose **Open editing window ↗**.

The separate browser window embeds the actual local page at the full window viewport. The bottom toolbar can be dragged by its grip; arrow keys move it, and Home or double-click returns it to its default position. Layers and Design open as optional overlay panels without changing the site's breakpoint. Formatting controls stay attached to the selected element.

**Edit** selects and edits source-backed elements. **Browse** lets the actual site handle links and forms. Save or discard an unfinished draft before switching modes. Static button labels and supported Tailwind appearance controls use the same source-verified editing workflow as text.

Local source containers, including whole sections, can be dragged by their centered Move handle. Their descendants move together; only the container's pixel translation changes. Shift locks one axis, Escape cancels, and the arrow controls move in 4 px steps. This adjusts visual position while preserving document flow and sibling order. Existing incompatible transforms and inline styles are refused safely. Movement currently requires Default scope in the local source canvas.

Several gestures can form one local draft. Source files are untouched until **Save changes**; **Undo** restores that saved edit. Refresh recovers the draft and the local preview connection. Imported drafts are scoped to the project and one source file at a time: save or discard before editing another file. This is not a multi-file transaction.

Connections require a separate loopback HTTP(S) server and an installed project adapter. The preview's frame policy must allow Studio. This workflow edits the local checkout; it does not publish or edit a production deployment. Unsupported frameworks and dynamic source expressions still require code editing.

Validation: `npm run test:window` runs project isolation/conflict checks, the source bridge browser cases, separate local and imported browser-window workflows, application typechecking, and the production build in a disposable workspace.
