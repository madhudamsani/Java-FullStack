package com.showvault.dto;

import java.math.BigDecimal;
import java.util.List;

public class BookingRequestDTO {
    private List<Long> seatIds;
    private BigDecimal totalAmount;
    private String sessionId; // Session ID for seat reservations
    private String promotionCode; // Promotion code for discounts

    public List<Long> getSeatIds() {
        return seatIds;
    }

    public void setSeatIds(List<Long> seatIds) {
        this.seatIds = seatIds;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }
    
    public String getSessionId() {
        return sessionId;
    }
    
    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
    
    public String getPromotionCode() {
        return promotionCode;
    }
    
    public void setPromotionCode(String promotionCode) {
        this.promotionCode = promotionCode;
    }

    @Override
    public String toString() {
        return "BookingRequestDTO{" +
                "seatIds=" + seatIds +
                ", totalAmount=" + totalAmount +
                ", sessionId='" + sessionId + '\'' +
                ", promotionCode='" + promotionCode + '\'' +
                '}';
    }
}