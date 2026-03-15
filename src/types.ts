export interface A11yViolation {
  selector: string;
  violationDescription: string;
  wcagCriterion?: string;
}

export interface A11yComponentInfo {
  name: string;
  source: string | null;   // e.g. "http://localhost:3000/src/components/Button.tsx"
  fileName: string | null;
  lineNumber: number | null;
}

export interface A11yComponentPayload {
  violation: A11yViolation;
  component: A11yComponentInfo;
}

export interface WireMessage {
  type: 'A11Y_COMPONENT';
  payload: A11yComponentPayload;
}
