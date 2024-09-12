// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const countButton = document.getElementById('countRecipe');
  const loadingDiv = document.getElementById('loading');
  const errorDiv = document.getElementById('error');
  const resultDiv = document.getElementById('result');
  const recipeAnalysisPre = document.getElementById('recipeAnalysis');
  const remainingCallsDiv = document.getElementById('remainingCalls');
  const tierInfoDiv = document.getElementById('tierInfo');
  const upgradePromptDiv = document.getElementById('upgradePrompt');
  const upgradeLink = document.getElementById('upgradeLink');

  // Remove these lines
  // const upgradeBasicButton = document.getElementById('upgradeBasic');
  // const upgradePremiumButton = document.getElementById('upgradePremium');

  // Set the upgrade link URL
  const UPGRADE_URL = 'https://mdavis3.github.io/recipe-calorie-counter-upgrade/pricing.html';
  upgradeLink.href = UPGRADE_URL;

  function updateRemainingCalls() {
    chrome.runtime.sendMessage({action: "getRemainingCalls"}, function(response) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        remainingCallsDiv.textContent = "Error fetching remaining calls";
      } else {
        if (response.remainingCalls === Infinity) {
          remainingCallsDiv.textContent = "Unlimited recipe counts (Premium tier)";
        } else {
          remainingCallsDiv.textContent = `${response.remainingCalls} out of ${response.weeklyLimit} recipe counts left this week`;
          if (response.remainingCalls === 0) {
            showUpgradePrompt();
          }
        }
      }
    });
  }

  function loadLastAnalysis() {
    chrome.storage.local.get(['lastAnalysis'], function(result) {
      if (result.lastAnalysis) {
        resultDiv.classList.remove('hidden');
        recipeAnalysisPre.textContent = result.lastAnalysis;
      }
    });
  }

  function updateTierInfo() {
    chrome.runtime.sendMessage({action: "getUserTier"}, function(response) {
      const tier = response.tier;
      tierInfoDiv.textContent = `Current Tier: ${tier}`;
      
      // Remove this block
      /*
      if (tier === 'FREE') {
        upgradeBasicButton.style.display = 'inline-block';
        upgradePremiumButton.style.display = 'inline-block';
      } else if (tier === 'BASIC') {
        upgradeBasicButton.style.display = 'none';
        upgradePremiumButton.style.display = 'inline-block';
      } else {
        upgradeBasicButton.style.display = 'none';
        upgradePremiumButton.style.display = 'none';
      }
      */
    });
  }

  updateTierInfo();
  updateRemainingCalls();
  loadLastAnalysis();

  function showUpgradePrompt() {
    upgradePromptDiv.classList.remove('hidden');
  }

  function hideUpgradePrompt() {
    upgradePromptDiv.classList.add('hidden');
  }

  countButton.addEventListener('click', function() {
    loadingDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    resultDiv.classList.add('hidden');
    hideUpgradePrompt();

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (chrome.runtime.lastError) {
        showMessage("Error accessing current tab.", true);
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, {action: "extractContent"}, function(extractedContent) {
        if (chrome.runtime.lastError) {
          showMessage("Error extracting recipe. Please refresh the page and try again.", true);
          return;
        }

        if (!extractedContent) {
          showMessage("No recipe found on this page. Try a different recipe website.", false);
          return;
        }

        chrome.runtime.sendMessage({action: "analyzeRecipe", extractedContent: extractedContent}, function(response) {
          loadingDiv.classList.add('hidden');
          if (chrome.runtime.lastError) {
            showMessage("Error analyzing recipe. Please try again.", true);
          } else if (response.error) {
            if (response.upgradeRequired) {
              showUpgradePrompt();
            } else {
              showMessage(response.message || "An error occurred during analysis.", true);
            }
          } else {
            resultDiv.classList.remove('hidden');
            recipeAnalysisPre.textContent = response.analysis || 'No analysis available';
            // Store the last analysis
            chrome.storage.local.set({ lastAnalysis: response.analysis });
            remainingCallsDiv.textContent = `${response.remainingCalls} out of ${response.weeklyLimit} recipe counts left this week`;
            if (response.remainingCalls === 0) {
              showUpgradePrompt();
            }
          }
        });
      });
    });
  });

  function showMessage(message, isError) {
    loadingDiv.classList.add('hidden');
    errorDiv.classList.remove('hidden');
    errorDiv.textContent = message;
    errorDiv.style.color = isError ? '#FF4136' : '#FF8C1A';
  }
});