# AdvantageScope

[![Build](https://github.com/Mechanical-Advantage/AdvantageScope/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/Mechanical-Advantage/AdvantageScope/actions/workflows/build.yml)

AdvantageScope is a robot diagnostics, log review/analysis, and data visualization application for FIRST Robotics Competition teams. It reads logs in WPILOG, DS log, and RLOG file formats, plus live robot data viewing using NT4 or RLOG streaming. AdvantageScope can be used with any WPILib project, but is also optimized for use with our [AdvantageKit](https://github.com/Mechanical-Advantage/AdvantageKit) logging framework.

It includes the following tools:

- A wide selection of flexible graphs and charts
- 2D and 3D field visualizations of odometry data, with customizable CAD-based robots
- Synchronized video playback from a separately loaded match video
- Joystick visualization, showing driver actions on customizable controller representations
- Swerve drive module vector displays
- Console message review
- Log statistics analysis
- Flexible export options, with support for CSV and WPILOG

**View the [online documentation](/docs/INDEX.md) or find it offline by clicking the 📖 icon in the tab bar.**

![Example screenshot](/docs/resources/screenshot-light.png)

## Installation

1. Find the [latest release](https://github.com/Mechanical-Advantage/AdvantageScope/releases/latest) under "Releases".
2. Download the appropriate build based on the OS & architecture. AdvantageScope supports Windows, macOS, and Linux on both x86 and ARM architectures.
