/*
 * SPDX-License-Identifier: EUPL-1.2 OR LicenseRef-commercial
 *
 * Copyright (c) 2012-2026 mgm technology partners GmbH
 *
 * Dual License
 * ------------
 * This source file is part of the mgm A12 Platform and available under
 * a choice of two different licenses:
 *
 * 1. Open-Source License - EUPL v1.2
 *    You may redistribute and/or modify this file under the terms of the
 *    European Union Public License, version 1.2 - see https://eupl.eu/.
 *
 * 2. Commercial License
 *    Alternatively, you may obtain a commercial license from
 *    mgm technology partners GmbH, that permits use of this software
 *    under different terms (including support and maintenance services).
 *
 *    Please contact a12-license@mgm-tp.com for more information.
 *
 * You must select and comply with exactly one of the above license options.
 *
 * Warranty Disclaimer (applies to either option)
 * ----------------------------------------------
 * THIS SOFTWARE IS PROVIDED "AS IS" AND WITHOUT WARRANTY OF ANY KIND,
 * WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NON-INFRINGEMENT, EXCEPT WHERE SUCH DISCLAIMERS ARE HELD TO BE
 * LEGALLY INVALID. SEE THE RESPECTIVE LICENSE TEXT FOR DETAILS.
 */

import type { DeepPartial, DefaultThemeType, Duration } from "@com.mgmtp.a12.widgets/widgets-core";
import { createTheme } from "@com.mgmtp.a12.widgets/widgets-core";

import AutoDiscoveredThemes from "./themes.generated";

// Deep type replacement helper
type ReplaceDeep<T, From, To> = T extends From
    ? To
    : T extends Array<infer U>
      ? Array<ReplaceDeep<U, From, To>>
      : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<ReplaceDeep<U, From, To>>
        : T extends object
          ? { [K in keyof T]: ReplaceDeep<T[K], From, To> }
          : T;

// It is necessary to replace Duration type (literal string type) with string type for raw theme JSON import
type RawThemeType = ReplaceDeep<DefaultThemeType, Duration, string>;

// Using RawThemeType still enables regular type checking of theme (except Duration literal types)
const rawThemes: Record<string, DeepPartial<RawThemeType>> = AutoDiscoveredThemes;

export const customThemes: Record<string, DefaultThemeType> = Object.entries(rawThemes).reduce(
    (result, [themeName, themeContent]) => {
        // Simple cast to make the raw theme type usable by createTheme
        // - ATTENTION: this skips literal type validation of Duration type entries!
        return { ...result, [themeName]: createTheme(themeContent as DefaultThemeType) };
    },
    {}
);
