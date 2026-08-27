import React from "react";

// Catches render-phase errors from the WebGL hero background specifically,
// so a shader/driver failure degrades to the static gradient fallback
// instead of taking down the entire page (App has no other error boundary).
export default class HeroBackgroundBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (import.meta.env?.DEV) {
      console.warn("Hero background failed, showing static fallback:", error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
