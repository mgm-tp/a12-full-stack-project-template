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

import type { OidcStandardClaims } from "oidc-client-ts";

import { StoreFactories, LocaleActions } from "@com.mgmtp.a12.client/client-core";
import { UaaActions, type UaaExtendedUser } from "@com.mgmtp.a12.uaa/uaa-authentication-client";

import { supportedLocales } from "../localization";
import { isRedirectFromKeyCloak } from "../uaa/integration";
import { isObject } from "../utils/guards";

interface UaaExtendedOauth2User extends UaaExtendedUser {
    profile: OidcStandardClaims;
}

function assertIsUaaExtendedOauth2User(user: unknown): asserts user is UaaExtendedOauth2User {
    if (!isObject(user) || !("profile" in user) || typeof user.profile !== "object" || user.profile === null) {
        throw new TypeError("Invalid user object: expected UaaExtendedOauth2User");
    }
}

/**
 * If Keycloak internationalization is being configured, this takes care of the retrieval of the used locale selected on the login screen.
 * Sets the locale in the application, english is taken as default if no locale is specified by Keycloak.
 *
 */
export const setLocaleKeycloakOnLoginMiddleware = StoreFactories.createMiddleware((api, next, action) => {
    if (UaaActions.loggedIn.match(action) && isRedirectFromKeyCloak()) {
        const user = action.payload.user;
        assertIsUaaExtendedOauth2User(user);
        const defaultLocale = getDefaultLocale(user);
        if (defaultLocale) {
            next(LocaleActions.set(defaultLocale));
        }
    }
    return next(action);
});

const getDefaultLocale = (user: UaaExtendedOauth2User) => {
    const locale = user.profile.locale;
    return supportedLocales.find((item) => item.language === locale);
};
