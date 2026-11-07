# Third-party materials

| Material | Installed version | License | Use |
| --- | --- | --- | --- |
| lucide-react | 1.55.0 | ISC | Existing editor icons. Icons added during this sprint will use this installed dependency. |
| playwright-core | 1.64.0 | Apache-2.0 | Existing browser-test dependency. Overlay PNG comparisons call its bundled pixelmatch comparator. No vendor source was copied. |

The installed package metadata supplied the version and license. No dependencies, editor source files, styles, text or assets have been imported during Parts 0 and the guard amendments. Existing battery tests install their existing Tailwind v3 fixture dependencies only inside temporary workspaces.

Part 2a adds original application code and browser-generated screenshots of this application. The PNG comparison helper uses Playwright's installed internal comparator API, which may require adjustment when that dependency is upgraded. No new dependency was added.
