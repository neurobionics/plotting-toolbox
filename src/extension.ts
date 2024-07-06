import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { parse } from "csv-parse/sync";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("plottingToolbox.plot", () => {
			const panel = createWebviewPanel(context);
			setupWebviewContent(panel, context);
			handleWebviewMessages(panel);
			const { data, columns } = getCSVData(context);

			if (
				!data ||
				!columns ||
				data.length === 0 ||
				columns.length === 0
			) {
				vscode.window.showErrorMessage("No data found in the CSV file");
				return;
			}

			panel.webview.postMessage({ data, columns });
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

function handleWebviewMessages(panel: vscode.WebviewPanel | undefined) {
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

function getCSVData(context: vscode.ExtensionContext): {
	data: any[];
	columns: string[];
} {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage(
			"Editor not found. Please open a CSV file to plot"
		);
		return { data: [], columns: [] };
	}

	const document = editor.document;
	const fileName = document.fileName;

	if (!fileName.endsWith(".csv")) {
		vscode.window.showErrorMessage("Please open a CSV file to plot");
		return { data: [], columns: [] };
	}

	const data = getDataFromCSV(fileName);
	const columns = getColumnsFromData(data);
	return { data, columns };
}

function getDataFromCSV(fileName: string): any[] {
	const csvContent = fs.readFileSync(fileName, "utf8");
	return parse(csvContent, {
		columns: true,
		skip_empty_lines: true,
	});
}

function getColumnsFromData(data: any[]): string[] {
	return data.length === 0 ? [] : Object.keys(data[0]);
}

function savePlot(data: string, fileName: string) {
	const base64Data = data.replace(/^data:image\/png;base64,/, "");
	fs.writeFile(fileName, base64Data, "base64", (err) => {
		if (err) {
			console.log(err);
		}
	});
}
