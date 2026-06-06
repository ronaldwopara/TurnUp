"use client";

type ExtractionDebugPanelProps = {
  extractedText?: string;
  warnings?: string[];
  confidence?: number;
  debug?: {
    titleCandidates?: string[];
    detectedDates?: string[];
    detectedLocations?: string[];
    confidenceBreakdown?: Record<string, number>;
  };
};

export function ExtractionDebugPanel({ extractedText, warnings, confidence, debug }: ExtractionDebugPanelProps) {
  return (
    <details className="camera-debug-panel">
      <summary>Debug extraction details</summary>
      <div className="camera-debug-content">
        <p>Confidence: {typeof confidence === "number" ? `${Math.round(confidence)}%` : "n/a"}</p>
        {warnings?.length ? (
          <div>
            <strong>Warnings</strong>
            <ul>
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {debug?.titleCandidates?.length ? (
          <div>
            <strong>Title candidates</strong>
            <ul>
              {debug.titleCandidates.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {debug?.detectedDates?.length ? (
          <div>
            <strong>Detected dates</strong>
            <ul>
              {debug.detectedDates.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {debug?.detectedLocations?.length ? (
          <div>
            <strong>Detected locations</strong>
            <ul>
              {debug.detectedLocations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {debug?.confidenceBreakdown ? (
          <div>
            <strong>Confidence breakdown</strong>
            <ul>
              {Object.entries(debug.confidenceBreakdown).map(([label, value]) => (
                <li key={label}>
                  {label}: {value}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {extractedText ? (
          <div>
            <strong>OCR text</strong>
            <pre>{extractedText}</pre>
          </div>
        ) : null}
      </div>
    </details>
  );
}
