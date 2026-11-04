import { TestBed } from '@angular/core/testing';
import { ASK_AGAIN_AFTER, Install } from './install';

describe('Install', () => {
  const iphone =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const ipad =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
  const chromeOnIphone =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';

  function create(userAgent?: string, touchPoints = 5): Install {
    if (userAgent) {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
      // jsdom has no maxTouchPoints.
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: touchPoints,
        configurable: true,
      });
    }
    return TestBed.inject(Install);
  }

  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as { maxTouchPoints?: number }).maxTouchPoints;
  });

  it('adds to the Home Screen from iPhone Safari', () => {
    expect(create(iphone).safari).toBe(true);
  });

  it('knows an iPad by its touch screen, though it says it is a Mac', () => {
    expect(create(ipad).safari).toBe(true);
  });

  it("doesn't take a Mac for an iPad", () => {
    expect(create(ipad, 0).safari).toBe(false);
  });

  it("doesn't show Safari's steps in other iPhone browsers", () => {
    expect(create(chromeOnIphone).safari).toBe(false);
  });

  it("can't install until the browser offers to", async () => {
    const install = create();
    expect(install.canInstall()).toBe(false);

    const prompt = vi.fn().mockResolvedValue(undefined);
    dispatchEvent(Object.assign(new Event('beforeinstallprompt'), { prompt }));

    expect(install.canInstall()).toBe(true);
    await install.prompt();
    expect(prompt).toHaveBeenCalled();
    // Each offer can be shown once.
    expect(install.canInstall()).toBe(false);
  });

  it('asks after the first workout day, then once more after a few more', () => {
    const install = create();

    expect(install.askDue(0)).toBe(false);
    expect(install.askDue(1)).toBe(true);
    install.asking(1);
    expect(install.askDue(1 + ASK_AGAIN_AFTER - 1)).toBe(false);
    expect(install.askDue(1 + ASK_AGAIN_AFTER)).toBe(true);
    install.asking(1 + ASK_AGAIN_AFTER);
    expect(install.askDue(100)).toBe(false);
  });

  it('remembers a closed Add to Home Screen line', () => {
    create().hideLine();
    TestBed.resetTestingModule();

    expect(TestBed.inject(Install).lineHidden()).toBe(true);
  });
});
