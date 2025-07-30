package com.showvault.service;

import com.showvault.model.Booking;
import com.showvault.model.BookingStatus;
import com.showvault.model.SeatBooking;
import com.showvault.model.ShowSchedule;
import com.showvault.model.User;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Element;
import com.itextpdf.text.Font;
import com.itextpdf.text.FontFactory;
import com.itextpdf.text.Image;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.Rectangle;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class TicketService {

    private final BookingService bookingService;
    
    @Autowired
    public TicketService(BookingService bookingService) {
        this.bookingService = bookingService;
    }
    
    /**
     * Generate a PDF ticket for a booking
     * @param bookingId The ID of the booking
     * @return Byte array containing the PDF ticket
     */
    public byte[] generateTicketPdf(Long bookingId) {
        Optional<Booking> bookingOpt = bookingService.getBookingById(bookingId);
        return processBookingForTicket(bookingOpt, "ID: " + bookingId);
    }
    
    /**
     * Generate a PDF ticket for a booking by booking number
     * @param bookingNumber The booking number
     * @return Byte array containing the PDF ticket
     */
    public byte[] generateTicketPdfByBookingNumber(String bookingNumber) {
        Optional<Booking> bookingOpt = bookingService.getBookingByNumber(bookingNumber);
        return processBookingForTicket(bookingOpt, "number: " + bookingNumber);
    }
    
    /**
     * Process booking for ticket generation
     * @param bookingOpt Optional containing the booking
     * @param identifier Identifier for error messages
     * @return Byte array containing the PDF ticket
     */
    private byte[] processBookingForTicket(Optional<Booking> bookingOpt, String identifier) {
        if (bookingOpt.isEmpty()) {
            throw new IllegalArgumentException("Booking not found with " + identifier);
        }
        
        Booking booking = bookingOpt.get();
        
        // Only generate tickets for confirmed bookings
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalStateException("Cannot generate ticket for booking with status: " + booking.getStatus());
        }
        
        return generatePdf(booking);
    }
    
    /**
     * Generate QR code for a booking
     * @param booking The booking
     * @return Byte array containing the QR code image
     */
    public byte[] generateQRCode(Booking booking) {
        // Use existing QR code data if available, otherwise create new content
        String qrContent;
        if (booking.getQrCodeData() != null && !booking.getQrCodeData().isEmpty()) {
            qrContent = booking.getQrCodeData();
            System.out.println("Using existing QR code data: " + qrContent);
        } else {
            // Create QR code content with booking details
            qrContent = String.format("BOOKING:%s,USER:%d,SCHEDULE:%d,DATE:%s",
                    booking.getBookingNumber(),
                    booking.getUser().getId(),
                    booking.getShowSchedule().getId(),
                    booking.getBookingDate().toString());
            
            // Save the QR code data to the booking
            booking.setQrCodeData(qrContent);
            System.out.println("Generated new QR code data: " + qrContent);
        }
        
        // Generate QR code image
        return generateQRCodeImage(qrContent, 200, 200);
    }
    
    /**
     * Generate QR code image
     * @param content The content to encode in the QR code
     * @param width The width of the QR code
     * @param height The height of the QR code
     * @return Byte array containing the QR code image
     */
    private byte[] generateQRCodeImage(String content, int width, int height) {
        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            
            // Generate QR code using ZXing
            BitMatrix bitMatrix = new MultiFormatWriter().encode(content, BarcodeFormat.QR_CODE, width, height);
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            
            return outputStream.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generating QR code", e);
        }
    }
    
    /**
     * Generate PDF for a booking
     * @param booking The booking
     * @return Byte array containing the PDF
     */
    private byte[] generatePdf(Booking booking) {
        try {
            // Get booking details
            User user = booking.getUser();
            ShowSchedule schedule = booking.getShowSchedule();
            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");
            
            // Create PDF document
            Document document = new Document();
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            PdfWriter.getInstance(document, outputStream);
            
            document.open();
            document.addTitle("E-Ticket - " + booking.getBookingNumber());
            document.addAuthor("ShowVault");
            document.addCreator("ShowVault Ticket System");
            document.addSubject("Event Ticket");
            document.addKeywords("ticket, event, booking, " + schedule.getShow().getTitle());
            
            // Add header with logo and title
            addDocumentHeader(document, booking.getBookingNumber());
            
            document.add(new Paragraph(" ")); // Add space
            
            // Add booking details table
            addBookingDetailsTable(document, booking, user, schedule, dateFormatter, timeFormatter);
            
            document.add(new Paragraph(" ")); // Add space
            
            // Add seat information
            addSeatInformation(document, booking);
            
            document.add(new Paragraph(" ")); // Add space
            
            // Add total amount
            addTotalAmount(document, booking);
            
            document.add(new Paragraph(" ")); // Add space
            
            // Add QR code
            addQRCode(document, booking);
            
            // Add footer
            addFooter(document);
            
            document.close();
            
            return outputStream.toByteArray();
        } catch (Exception e) {
            return generateFallbackPdf(booking, e);
        }
    }
    
    /**
     * Add document header with logo and title
     */
    private void addDocumentHeader(Document document, String bookingNumber) throws DocumentException {
        // Add header
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
        Paragraph header = new Paragraph("SHOW TICKET", headerFont);
        header.setAlignment(Element.ALIGN_CENTER);
        document.add(header);
        
        // Add booking number
        Font bookingNumberFont = FontFactory.getFont(FontFactory.HELVETICA, 12);
        Paragraph bookingNumberPara = new Paragraph("Booking #: " + bookingNumber, bookingNumberFont);
        bookingNumberPara.setAlignment(Element.ALIGN_CENTER);
        document.add(bookingNumberPara);
    }
    
    /**
     * Add booking details table
     */
    private void addBookingDetailsTable(Document document, Booking booking, User user, 
                                       ShowSchedule schedule, DateTimeFormatter dateFormatter, 
                                       DateTimeFormatter timeFormatter) throws DocumentException {
        try {
            // Create main table
            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            
            // Show details
            addTableCell(table, "Show:", schedule.getShow().getTitle(), true);
            addTableCell(table, "Venue:", schedule.getVenue().getName(), false);
            addTableCell(table, "Date:", schedule.getShowDate().format(dateFormatter), true);
            addTableCell(table, "Time:", schedule.getStartTime().format(timeFormatter), false);
            
            // Customer details
            addTableCell(table, "Customer:", user.getFirstName() + " " + user.getLastName(), true);
            addTableCell(table, "Email:", user.getEmail(), false);
            
            document.add(table);
        } catch (Exception e) {
            // If there's an error with the table, add simple text instead
            document.add(new Paragraph("Show: " + schedule.getShow().getTitle()));
            document.add(new Paragraph("Venue: " + schedule.getVenue().getName()));
            document.add(new Paragraph("Date: " + schedule.getShowDate().format(dateFormatter)));
            document.add(new Paragraph("Time: " + schedule.getStartTime().format(timeFormatter)));
            document.add(new Paragraph("Customer: " + user.getFirstName() + " " + user.getLastName()));
            document.add(new Paragraph("Email: " + user.getEmail()));
        }
    }
    
    /**
     * Add seat information to the document
     */
    private void addSeatInformation(Document document, Booking booking) throws DocumentException {
        try {
            // Seats information
            Font seatHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Paragraph seatHeader = new Paragraph("Seat Information", seatHeaderFont);
            document.add(seatHeader);
            
            PdfPTable seatTable = new PdfPTable(3);
            seatTable.setWidthPercentage(100);
            
            // Add seat table headers
            PdfPCell rowHeaderCell = new PdfPCell(new Phrase("Row", seatHeaderFont));
            rowHeaderCell.setBackgroundColor(new com.itextpdf.text.BaseColor(240, 240, 240));
            seatTable.addCell(rowHeaderCell);
            
            PdfPCell seatHeaderCell = new PdfPCell(new Phrase("Seat", seatHeaderFont));
            seatHeaderCell.setBackgroundColor(new com.itextpdf.text.BaseColor(240, 240, 240));
            seatTable.addCell(seatHeaderCell);
            
            PdfPCell categoryHeaderCell = new PdfPCell(new Phrase("Category", seatHeaderFont));
            categoryHeaderCell.setBackgroundColor(new com.itextpdf.text.BaseColor(240, 240, 240));
            seatTable.addCell(categoryHeaderCell);
            
            // Add seat information
            if (booking.getSeatBookings() != null) {
                for (SeatBooking seatBooking : booking.getSeatBookings()) {
                    if (seatBooking.getSeat() != null) {
                        seatTable.addCell(seatBooking.getSeat().getRowName() != null ? seatBooking.getSeat().getRowName() : "");
                        seatTable.addCell(seatBooking.getSeat().getSeatNumber() != null ? String.valueOf(seatBooking.getSeat().getSeatNumber()) : "");
                        seatTable.addCell(seatBooking.getSeat().getCategory() != null ? seatBooking.getSeat().getCategory().toString() : "");
                    }
                }
            }
            
            document.add(seatTable);
        } catch (Exception e) {
            // If there's an error with the seat table, add simple text
            document.add(new Paragraph("Seat Information:"));
            if (booking.getSeatBookings() != null) {
                for (SeatBooking seatBooking : booking.getSeatBookings()) {
                    if (seatBooking.getSeat() != null) {
                        document.add(new Paragraph("Row: " + (seatBooking.getSeat().getRowName() != null ? seatBooking.getSeat().getRowName() : "") + 
                                                  ", Seat: " + (seatBooking.getSeat().getSeatNumber() != null ? seatBooking.getSeat().getSeatNumber() : "") + 
                                                  ", Category: " + (seatBooking.getSeat().getCategory() != null ? seatBooking.getSeat().getCategory() : "")));
                    }
                }
            }
        }
    }
    
    /**
     * Add total amount to the document
     */
    private void addTotalAmount(Document document, Booking booking) throws DocumentException {
        Font totalFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
        Paragraph totalPara = new Paragraph("Total Amount: $" + booking.getTotalAmount(), totalFont);
        totalPara.setAlignment(Element.ALIGN_RIGHT);
        document.add(totalPara);
    }
    
    /**
     * Add QR code to the document
     */
    private void addQRCode(Document document, Booking booking) throws DocumentException {
        try {
            // Add QR code
            byte[] qrCodeBytes = generateQRCode(booking);
            if (qrCodeBytes.length > 0) {
                Image qrCodeImage = Image.getInstance(qrCodeBytes);
                qrCodeImage.setAlignment(Element.ALIGN_CENTER);
                qrCodeImage.scaleToFit(150, 150);
                document.add(qrCodeImage);
                
                // Add QR code caption
                Font qrCaptionFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
                Paragraph qrCaption = new Paragraph("Scan this QR code at the venue entrance", qrCaptionFont);
                qrCaption.setAlignment(Element.ALIGN_CENTER);
                document.add(qrCaption);
            }
        } catch (Exception e) {
            // If QR code fails, just add a note
            document.add(new Paragraph("Please show this ticket at the venue entrance."));
        }
    }
    
    /**
     * Add footer to the document
     */
    private void addFooter(Document document) throws DocumentException {
        document.add(new Paragraph(" ")); // Add space
        Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Font.ITALIC);
        Paragraph footer = new Paragraph("This is an electronic ticket. Please present this ticket (printed or digital) at the venue entrance.", footerFont);
        footer.setAlignment(Element.ALIGN_CENTER);
        document.add(footer);
    }
    
    /**
     * Generate a fallback PDF if the main generation fails
     */
    private byte[] generateFallbackPdf(Booking booking, Exception originalException) {
        try {
            System.out.println("Generating fallback PDF for booking: " + booking.getBookingNumber());
            System.out.println("Original error: " + originalException.getMessage());
            
            Document document = new Document();
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            PdfWriter.getInstance(document, outputStream);
            
            document.open();
            document.add(new Paragraph("SHOW TICKET"));
            document.add(new Paragraph("Booking #: " + booking.getBookingNumber()));
            document.add(new Paragraph("This is a backup ticket due to an error in generating the full ticket."));
            document.add(new Paragraph("Please contact customer support if you have any issues."));
            
            // Add basic booking details if available
            try {
                document.add(new Paragraph(" "));
                document.add(new Paragraph("Show: " + booking.getShowSchedule().getShow().getTitle()));
                document.add(new Paragraph("Date: " + booking.getShowSchedule().getShowDate()));
                document.add(new Paragraph("Time: " + booking.getShowSchedule().getStartTime()));
                document.add(new Paragraph("Venue: " + booking.getShowSchedule().getVenue().getName()));
                document.add(new Paragraph("Customer: " + booking.getUser().getFirstName() + " " + booking.getUser().getLastName()));
                document.add(new Paragraph("Total Amount: $" + booking.getTotalAmount()));
            } catch (Exception e) {
                // If we can't get these details, just continue
                document.add(new Paragraph("Additional booking details unavailable"));
            }
            
            document.close();
            
            return outputStream.toByteArray();
        } catch (Exception fallbackException) {
            System.err.println("Error generating fallback PDF: " + fallbackException.getMessage());
            fallbackException.printStackTrace();
            throw new RuntimeException("Error generating PDF ticket", originalException);
        }
    }
    
    
    /**
     * Helper method to add a cell to the table
     */
    private void addTableCell(PdfPTable table, String label, String value, boolean shaded) {
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
        
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        if (shaded) {
            labelCell.setBackgroundColor(new com.itextpdf.text.BaseColor(245, 245, 245));
        }
        labelCell.setBorder(Rectangle.NO_BORDER);
        table.addCell(labelCell);
        
        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        if (shaded) {
            valueCell.setBackgroundColor(new com.itextpdf.text.BaseColor(245, 245, 245));
        }
        valueCell.setBorder(Rectangle.NO_BORDER);
        table.addCell(valueCell);
    }
}