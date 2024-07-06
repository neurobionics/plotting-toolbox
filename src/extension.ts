import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import csv from "csv-parser";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("plottingToolbox.plot", async () => {
			const panel = createWebviewPanel(context);
			setupWebviewContent(panel, context);
			handleWebviewMessages(panel, context);

			const { columns } = await getCSVColumns(context);

			if (!columns || columns.length === 0) {
				vscode.window.showErrorMessage(
					"No columns found in the CSV file"
				);
				return;
			}

			panel.webview.postMessage({ columns });

			// Stream data to the webview
			const csvStream = streamCSVData(context);
			for await (const row of csvStream) {
				panel.webview.postMessage({ command: "addRow", row });
			}
		})
	);
}

function createWebviewPanel(
	context: vscode.ExtensionContext
): vscode.WebviewPanel {
	return vscode.window.createWebviewPanel(
		"plottingToolbox",
		"Plotting Toolbox",
		vscode.ViewColumn.One,
		{
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.file(path.join(context.extensionPath, "media")),
			],
			retainContextWhenHidden: true,
		}
	);
}

function setupWebviewContent(
	panel: vscode.WebviewPanel,
	context: vscode.ExtensionContext
) {
	const htmlPath = vscode.Uri.file(
		path.join(context.extensionPath, "media", "webview.html")
	);
	const cssPath = panel.webview.asWebviewUri(
		vscode.Uri.file(path.join(context.extensionPath, "media", "style.css"))
	);
	const jsPath = panel.webview.asWebviewUri(
		vscode.Uri.file(path.join(context.extensionPath, "media", "script.js"))
	);

	let html = fs.readFileSync(htmlPath.fsPath, "utf8");
	html = html
		.replace('href="style.css"', `href="${cssPath}"`)
		.replace('src="script.js"', `src="${jsPath}"`);

	panel.webview.html = html;
}

function handleWebviewMessages(
	panel: vscode.WebviewPanel | undefined,
	context: vscode.ExtensionContext
) {
	panel?.webview.onDidReceiveMessage(async (message) => {
		if (message.command === "savePlot") {
			const uri = await vscode.window.showSaveDialog({
				defaultUri: vscode.Uri.file(
					path.join(vscode.workspace.rootPath || "", "plot.png")
				),
				filters: { Images: ["png"] },
			});
			if (uri) {
				savePlot(message.data, uri.fsPath);
			}
		}
	});

	panel?.onDidDispose(() => {
		panel = undefined;
	});
}

async function getCSVColumns(
	context: vscode.ExtensionContext
): Promise<{ columns: string[] }> {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage(
			"Editor not found. Please open a CSV file to plot"
		);
		return { columns: [] };
	}

	const document = editor.document;
	const fileName = document.fileName;

	if (!fileName.endsWith(".csv")) {
		vscode.window.showErrorMessage("Please open a CSV file to plot");
		return { columns: [] };
	}

	return new Promise((resolve, reject) => {
		const stream = fs
			.createReadStream(fileName)
			.pipe(csv())
			.on("headers", (headers) => {
				resolve({ columns: headers });
				stream.destroy();
			})
			.on("error", (error) => {
				vscode.window.showErrorMessage("Error reading CSV file");
				reject(error);
			});
	});
}

async function* streamCSVData(
	context: vscode.ExtensionContext
): AsyncIterable<any> {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage(
			"Editor not found. Please open a CSV file to plot"
		);
		return;
	}

	const document = editor.document;
	const fileName = document.fileName;

	if (!fileName.endsWith(".csv")) {
		vscode.window.showErrorMessage("Please open a CSV file to plot");
		return;
	}

	const stream = fs.createReadStream(fileName).pipe(csv());
	for await (const row of stream) {
		yield row;
	}
}

function savePlot(data: string, fileName: string) {
	const base64Data = data.replace(/^data:image\/png;base64,/, "");
	fs.writeFile(fileName, base64Data, "base64", (err) => {
		if (err) {
			console.log(err);
		}
	});
}
