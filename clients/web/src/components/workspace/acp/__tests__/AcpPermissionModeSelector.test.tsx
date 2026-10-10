import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/test/test-utils";
import { AcpPermissionModeSelector } from "@/components/workspace/acp/AcpPermissionModeSelector";
import {
  __seedAcpSessionForTests,
  __resetAcpSessionsForTests,
} from "@/stores/acpSession";
import { EMPTY_SESSION } from "@/stores/acpSessionTypes";

vi.mock("@/stores/relayConnection", () => ({
  relayPool: {
    sendAcpCommand: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
  },
}));

function seed(podKey: string, permissionMode: string, supportedPermissionModes: string[]) {
  __seedAcpSessionForTests(podKey, {
    ...EMPTY_SESSION,
    configuration: { permissionMode, model: "", supportedPermissionModes },
  });
}

// The trigger label proves which set (advertised vs Claude fallback) is in
// effect for these cases, without opening the Radix menu.
describe("AcpPermissionModeSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetAcpSessionsForTests();
  });

  it("renders the agent's advertised mode label when capability is present", () => {
    seed("pod-1", "ask_dangerous", ["bypass", "ask_dangerous", "ask_any_write"]);
    render(<AcpPermissionModeSelector podKey="pod-1" />);
    expect(screen.getByText("Ask Risky")).toBeInTheDocument();
  });

  it("falls back to Claude modes when the agent advertises none", () => {
    seed("pod-1", "bypassPermissions", []);
    render(<AcpPermissionModeSelector podKey="pod-1" />);
    expect(screen.getByText("Bypass")).toBeInTheDocument();
  });

  it("shows the unknown placeholder when the active mode is outside the rendered set", () => {
    // A loopal mode with no advertisement → fallback set lacks it → "unknown".
    seed("pod-1", "ask_dangerous", []);
    render(<AcpPermissionModeSelector podKey="pod-1" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("keeps the permission menu scrollable within the available viewport height", async () => {
    const modes = Array.from({ length: 12 }, (_, index) => `custom-mode-${index}`);
    seed("pod-1", modes[0], modes);
    const user = userEvent.setup();
    render(<AcpPermissionModeSelector podKey="pod-1" />);

    await user.click(screen.getByRole("button"));

    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("max-h-[var(--radix-dropdown-menu-content-available-height)]");
    expect(menu).toHaveClass("overflow-auto");
    expect(menu).toHaveClass("overflow-x-hidden");
    expect(menu).not.toHaveClass("overflow-hidden");
    expect(screen.getAllByRole("menuitem")).toHaveLength(modes.length);
  });
});
