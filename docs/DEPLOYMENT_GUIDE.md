---
layout: default
title: Deployment Guide
---

# How to Deploy LocalStream Docs

The Landing Page and Wiki are designed to run on **GitHub Pages**.

## Initial Setup (One-time)

1.  Go to your GitHub repository: [https://github.com/maxabba/LocalStream/settings/pages](https://github.com/maxabba/LocalStream/settings/pages)
2.  Under **Build and deployment** > **Source**, select **"Deploy from a branch"**.
3.  Under **Branch**, select `main` and `/docs` folder.
    *   *Note: If you only see `/root`, ensure you have pushed the latest changes containing the `docs` folder.*
4.  Click **Save**.

## Deploying Updates

Once the initial setup is done, deployment is **automatic**.

**To update the content:**
1.  Make changes to the files in `docs/` (Markdown files, HTML, CSS).
2.  Commit and push your changes:
    ```bash
    git add docs/
    git commit -m "Update documentation"
    git push
    ```
3.  GitHub Pages will automatically rebuild and deploy the site (usually takes 30-60 seconds).

## Verifying Deployment

Your site will be available at: `https://maxabba.github.io/LocalStream/`
