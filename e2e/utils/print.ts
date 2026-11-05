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

import type { Response } from "@playwright/test";

import { expect, type Page } from "../fixtures";
import type { ObservedRpcCall, RpcObserver, RpcRequest, RpcResponse } from "../types";
import { TestID } from "../types/testIds";

import { API_PATH } from "./api";

const PRINT_RPC_METHOD = "PRINT";
const SAVE_RPC_METHODS = ["ADD_DOCUMENT", "MODIFY_DOCUMENT", "PARTIAL_MODIFY_DOCUMENT"];

export const PRINT_TIMEOUT = 30_000;
const PRINT_REQUEST_DELAY = 1500;

declare global {
    interface Window {
        __windowOpenCalls?: string[][];
    }
}

export async function observeRpc(page: Page, { delayPrintRequest = false } = {}): Promise<RpcObserver> {
    const calls: ObservedRpcCall[] = [];

    // Holding the print request back keeps the loading indicator observable while the print is in flight.
    if (delayPrintRequest) {
        await page.route(`**${API_PATH.RPC}**`, async (route) => {
            if (route.request().postData()?.includes(`"${PRINT_RPC_METHOD}"`)) {
                await new Promise((resolve) => setTimeout(resolve, PRINT_REQUEST_DELAY));
            }
            await route.continue();
        });
    }

    page.on("response", (response) => {
        const request = response.request();
        if (request.method() === "POST" && request.url().includes(API_PATH.RPC)) {
            void record(calls, response);
        }
    });

    return {
        observedMethods: () => calls.flatMap((call) => call.methods),
        waitForCall: async (methods: string[], timeout = PRINT_TIMEOUT) => {
            const findCall = () => calls.find((call) => call.methods.some((method) => methods.includes(method)));

            await expect
                .poll(() => !!findCall(), { timeout, message: `RPC call for ${methods.join(", ")}` })
                .toBe(true);

            return findCall()!;
        }
    };
}

export async function stubWindowOpen(page: Page): Promise<void> {
    await page.evaluate(() => {
        window.__windowOpenCalls = [];
        window.open = (...args: unknown[]) => {
            window.__windowOpenCalls!.push(args.map((argument) => String(argument)));
            return window;
        };
    });
}

export async function getWindowOpenCalls(page: Page): Promise<string[][]> {
    return await page.evaluate(() => window.__windowOpenCalls ?? []);
}

export async function assertApplicationBusy(page: Page): Promise<void> {
    await expect(page.getByTestId(TestID.PROGRESS_INDICATOR_OUTER_OVERLAY).first()).toBeVisible();
}

export async function assertApplicationNotBusy(page: Page): Promise<void> {
    await expect(page.getByTestId(TestID.PROGRESS_INDICATOR_OUTER_OVERLAY).first()).toBeHidden({
        timeout: PRINT_TIMEOUT
    });
}

export async function assertPrintedDocument(page: Page, observer: RpcObserver, printModelId: string): Promise<void> {
    const call = await observer.waitForCall([PRINT_RPC_METHOD]);

    const [printRequest] = call.request;
    expect(printRequest?.params?.printModelId, "printed Print Model").toBe(printModelId);
    expect(printRequest?.params?.docRef, "docRef of the printed document").toBeTruthy();

    const [printResponse] = call.response;
    expect(printResponse?.error, "error reported by the print service").toBeUndefined();
    expect(printResponse?.result, "URL of the generated PDF").toBeTruthy();

    await expect
        .poll(() => getWindowOpenCalls(page), { message: "recorded window.open calls" })
        .toEqual([[printResponse!.result, "_blank"]]);
}

export async function assertSavedBeforePrint(observer: RpcObserver, expectedContent: string): Promise<void> {
    const call = await observer.waitForCall(SAVE_RPC_METHODS);

    expect(JSON.stringify(call.request), "changed value in the save request").toContain(expectedContent);
    expect(call.response[0]?.error, "error reported while saving").toBeUndefined();

    const methods = observer.observedMethods();
    const saveIndex = methods.findIndex((method) => SAVE_RPC_METHODS.includes(method));
    const printIndex = methods.indexOf(PRINT_RPC_METHOD);
    expect(saveIndex, "position of the save request").toBeGreaterThanOrEqual(0);
    expect(printIndex, "print request sent after the document was saved").toBeGreaterThan(saveIndex);
}

async function record(calls: ObservedRpcCall[], response: Response): Promise<void> {
    try {
        const request = toArray<RpcRequest>(response.request().postDataJSON());
        const body = toArray<RpcResponse>(await response.json());
        calls.push({
            methods: request.map((entry) => entry?.method).filter((method): method is string => !!method),
            request,
            response: body
        });
    } catch {
        // Responses that are not JSON-RPC are irrelevant for the print flow.
    }
}

function toArray<T>(body: unknown): T[] {
    return (Array.isArray(body) ? body : [body]) as T[];
}
