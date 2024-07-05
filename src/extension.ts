import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { parse } from "csv-parse/sync";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("csvPlotter.plot", () => {
			const editor = vscode.window.activeTextEditor;

			let data: any[] = [];
			let columns: string[] = [];

			if (editor) {
				const document = editor.document;
				const fileName = document.fileName;

				if (!fileName.endsWith(".csv")) {
					vscode.window.showErrorMessage(
						"Please open a CSV file to plot"
					);
					return;
				} else {
					data = getDataFromCSV(fileName);
					columns = getColumnsFromData(data);
				}
			}

			if (!data || !columns) {
				vscode.window.showErrorMessage("No data found in the CSV file");
				return;
			}

			const panel = vscode.window.createWebviewPanel(
				"csvPlotter",
				"CSV Plotter",
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					localResourceRoots: [
						vscode.Uri.file(
							path.join(context.extensionPath, "media")
						),
					],
				}
			);

			const htmlPath = vscode.Uri.file(
				path.join(context.extensionPath, "media", "webview.html")
			);
			const cssPath = panel.webview.asWebviewUri(
				vscode.Uri.file(
					path.join(context.extensionPath, "media", "style.css")
				)
			);
			const jsPath = panel.webview.asWebviewUri(
				vscode.Uri.file(
					path.join(context.extensionPath, "media", "script.js")
				)
			);

			let html = fs.readFileSync(htmlPath.fsPath, "utf8");
			html = html.replace('href="style.css"', `href="${cssPath}"`);
			html = html.replace('src="script.js"', `src="${jsPath}"`);

			panel.webview.html = html;
			panel.webview.postMessage({ data, columns });

			panel.webview.onDidReceiveMessage((message) => {
				switch (message.command) {
					case "savePlot":
						vscode.window.showInformationMessage("Saving plot...");
						savePlot(message.data);
						break;
				}
			});
		})
	);
}

function getDataFromCSV(fileName: string): any[] {
	const csvContent = fs.readFileSync(fileName, "utf8");
	const records = parse(csvContent, {
		columns: true,
		skip_empty_lines: true,
	});
	return records;
}

function getColumnsFromData(data: any[]): string[] {
	if (data.length === 0) {
		return [];
	}
	return Object.keys(data[0]);
}

function savePlot(data: string, fileName: string = "plot.png") {
	vscode.window.showInformationMessage(data);
	data = data.replace(/^data:image\/png;base64,/, "");
	// Get the root path of the current workspace
	const workspaceRoot = vscode.workspace.rootPath;

	if (!workspaceRoot) {
		vscode.window.showErrorMessage("No workspace is open.");
		return;
	}

	// Resolve the file path in the current workspace directory
	const filePath = path.join(workspaceRoot, fileName);

	// Write the binary data to the file
	fs.writeFile(filePath, data, "base64", function (err) {
		console.log(err);
	});
}
